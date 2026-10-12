using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.CasosDeUso.Asignaciones
{
    /// <summary>
    /// Asigna listas a sucursales, grupos o pantallas, con vigencia y franjas semanales opcionales.
    /// Rechaza dos asignaciones habilitadas del mismo destino que coincidan a la vez en fechas y en horario,
    /// para que nunca haya dos listas candidatas con la misma prioridad.
    /// </summary>
    public class ServicioAsignaciones
    {
        private readonly IRepositorioAsignaciones _asignaciones;
        private readonly IRepositorioListas _listas;
        private readonly IRepositorioSucursales _sucursales;
        private readonly IRepositorioGruposPantallas _grupos;
        private readonly IRepositorioPantallas _pantallas;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;
        private readonly TimeProvider _reloj;

        public ServicioAsignaciones(
            IRepositorioAsignaciones asignaciones,
            IRepositorioListas listas,
            IRepositorioSucursales sucursales,
            IRepositorioGruposPantallas grupos,
            IRepositorioPantallas pantallas,
            IUnidadDeTrabajo unidadDeTrabajo,
            IRegistroAuditoria auditoria,
            TimeProvider reloj)
        {
            _asignaciones = asignaciones;
            _listas = listas;
            _sucursales = sucursales;
            _grupos = grupos;
            _pantallas = pantallas;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
            _reloj = reloj;
        }

        public async Task<IReadOnlyList<AsignacionListaDto>> ListarAsync(int? listaReproduccionId, CancellationToken ct = default)
        {
            var ahora = _reloj.GetUtcNow().UtcDateTime;
            return (await _asignaciones.ListarAsync(listaReproduccionId, ct)).Select(a => a.ADto(ahora)).ToList();
        }

        public async Task<AsignacionListaDto> CrearAsync(GuardarAsignacionDto dto, CancellationToken ct = default)
        {
            ValidadorAsignaciones.Validar(dto);
            var ahora = _reloj.GetUtcNow().UtcDateTime;
            var asignacion = new AsignacionLista { FechaCreacionUtc = ahora };
            await AplicarAsync(asignacion, dto, ahora, ct);

            _asignaciones.Agregar(asignacion);
            _auditoria.Registrar(AccionAuditoria.Crear, asignacion, Describir(asignacion));
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return asignacion.ADto(ahora);
        }

        public async Task<AsignacionListaDto> ActualizarAsync(int id, GuardarAsignacionDto dto, CancellationToken ct = default)
        {
            ValidadorAsignaciones.Validar(dto);
            var ahora = _reloj.GetUtcNow().UtcDateTime;
            var asignacion = await ObtenerEntidadAsync(id, ct);
            var estabaHabilitada = asignacion.EstaHabilitada;
            await AplicarAsync(asignacion, dto, ahora, ct);

            var accion = estabaHabilitada == asignacion.EstaHabilitada
                ? AccionAuditoria.Editar
                : asignacion.EstaHabilitada ? AccionAuditoria.Habilitar : AccionAuditoria.Deshabilitar;
            _auditoria.Registrar(accion, asignacion, Describir(asignacion));
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return asignacion.ADto(ahora);
        }

        public async Task EliminarAsync(int id, CancellationToken ct = default)
        {
            var asignacion = await ObtenerEntidadAsync(id, ct);
            _auditoria.Registrar(AccionAuditoria.Eliminar, asignacion, Describir(asignacion));
            _asignaciones.Eliminar(asignacion);
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
        }

        private async Task AplicarAsync(AsignacionLista asignacion, GuardarAsignacionDto dto, DateTime ahoraUtc, CancellationToken ct)
        {
            asignacion.ListaReproduccion = await _listas.ObtenerPorIdAsync(dto.ListaReproduccionId, ct)
                ?? throw new ExcepcionValidacion(nameof(dto.ListaReproduccionId), "La lista de reproducción no existe.");
            asignacion.ListaReproduccionId = dto.ListaReproduccionId;

            asignacion.SucursalId = dto.SucursalId;
            asignacion.GrupoPantallaId = dto.GrupoPantallaId;
            asignacion.PantallaId = dto.PantallaId;
            asignacion.Sucursal = dto.SucursalId.HasValue
                ? await _sucursales.ObtenerPorIdAsync(dto.SucursalId.Value, ct)
                    ?? throw new ExcepcionValidacion(nameof(dto.SucursalId), "La sucursal no existe.")
                : null;
            asignacion.GrupoPantalla = dto.GrupoPantallaId.HasValue
                ? await _grupos.ObtenerPorIdAsync(dto.GrupoPantallaId.Value, ct)
                    ?? throw new ExcepcionValidacion(nameof(dto.GrupoPantallaId), "El grupo de pantallas no existe.")
                : null;
            asignacion.Pantalla = dto.PantallaId.HasValue
                ? await _pantallas.ObtenerPorIdAsync(dto.PantallaId.Value, ct)
                    ?? throw new ExcepcionValidacion(nameof(dto.PantallaId), "La pantalla no existe.")
                : null;

            asignacion.EstaHabilitada = dto.EstaHabilitada;
            asignacion.FechaInicioUtc = dto.FechaInicioUtc;
            asignacion.FechaFinUtc = dto.FechaFinUtc;

            // Horarios nulos = no cambiar los existentes; una lista vacía los elimina.
            if (dto.Horarios is not null)
            {
                ReemplazarHorarios(asignacion, dto.Horarios);
            }

            asignacion.Validar();
            await VerificarAmbiguedadAsync(asignacion, ahoraUtc, ct);
        }

        private async Task VerificarAmbiguedadAsync(AsignacionLista asignacion, DateTime ahoraUtc, CancellationToken ct)
        {
            if (!asignacion.EstaHabilitada)
            {
                return;
            }

            var mismoDestino = await _asignaciones.ListarHabilitadasMismoDestinoAsync(asignacion, ct);
            var conflicto = mismoDestino.FirstOrDefault(o => o.Id != asignacion.Id && o.EsAmbiguaCon(asignacion, ahoraUtc));
            if (conflicto is not null)
            {
                throw new ExcepcionConflicto(
                    $"El destino ya tiene la lista '{conflicto.ListaReproduccion.Nombre}' asignada en fechas y horarios que " +
                    $"coinciden con esta (asignación {conflicto.Id}). Ajuste las fechas o los horarios, o deshabilite una de las asignaciones.");
            }
        }

        private static void ReemplazarHorarios(AsignacionLista asignacion, IReadOnlyList<GuardarReglaHorarioDto> horarios)
        {
            asignacion.ReglasHorario.Clear();
            foreach (var horario in horarios)
            {
                asignacion.ReglasHorario.Add(new ReglaHorario
                {
                    DiasSemana = horario.Dias.Aggregate(DiasSemana.Ninguno, (acumulado, dia) => acumulado | dia),
                    HoraInicio = horario.HoraInicio,
                    HoraFin = horario.HoraFin,
                    ZonaHorariaId = horario.ZonaHorariaId?.Trim() ?? ZonasHorarias.Predeterminada,
                    EstaActiva = horario.EstaActiva
                });
            }
        }

        private static string Describir(AsignacionLista asignacion)
        {
            var destino = asignacion.Pantalla is not null ? $"pantalla '{asignacion.Pantalla.Nombre}'"
                : asignacion.GrupoPantalla is not null ? $"grupo '{asignacion.GrupoPantalla.Nombre}'"
                : $"sucursal '{asignacion.Sucursal?.Nombre}'";
            return $"Lista '{asignacion.ListaReproduccion.Nombre}' → {destino}";
        }

        private async Task<AsignacionLista> ObtenerEntidadAsync(int id, CancellationToken ct) =>
            await _asignaciones.ObtenerPorIdAsync(id, ct) ?? throw new ExcepcionNoEncontrado("la asignación", id);
    }
}
