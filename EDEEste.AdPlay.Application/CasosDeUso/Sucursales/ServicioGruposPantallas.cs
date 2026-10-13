using EDEEste.AdPlay.Application.Comunes;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Domain.Services;

namespace EDEEste.AdPlay.Application.CasosDeUso.Sucursales
{
    /// <summary>
    /// Jerarquía de ubicaciones dentro de una sucursal.
    /// </summary>
    public class ServicioGruposPantallas
    {
        private readonly IRepositorioGruposPantallas _grupos;
        private readonly IRepositorioSucursales _sucursales;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;

        public ServicioGruposPantallas(
            IRepositorioGruposPantallas grupos,
            IRepositorioSucursales sucursales,
            IUnidadDeTrabajo unidadDeTrabajo,
            IRegistroAuditoria auditoria)
        {
            _grupos = grupos;
            _sucursales = sucursales;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
        }

        public async Task<IReadOnlyList<GrupoPantallaDto>> ListarAsync(int? sucursalId, CancellationToken ct = default) =>
            (await _grupos.ListarAsync(sucursalId, ct)).Select(g => g.ADto()).ToList();

        public async Task<GrupoPantallaDto> CrearAsync(GuardarGrupoPantallaDto dto, CancellationToken ct = default)
        {
            ValidadorSucursales.Validar(dto);
            var grupo = new GrupoPantalla();
            await AplicarAsync(grupo, dto, ct);

            _grupos.Agregar(grupo);
            _auditoria.Registrar(AccionAuditoria.Crear, grupo, $"Grupo '{grupo.Nombre}' en {grupo.Sucursal.Nombre}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return grupo.ADto();
        }

        public async Task<GrupoPantallaDto> ActualizarAsync(int id, GuardarGrupoPantallaDto dto, CancellationToken ct = default)
        {
            ValidadorSucursales.Validar(dto);
            var grupo = await _grupos.ObtenerPorIdAsync(id, ct) ?? throw new ExcepcionNoEncontrado("el grupo de pantallas", id);
            var estabaActivo = grupo.EstaActivo;
            await AplicarAsync(grupo, dto, ct);

            _auditoria.Registrar(
                AuditoriaExtensions.AccionDeEdicion(estabaActivo, grupo.EstaActivo),
                grupo,
                $"Grupo '{grupo.Nombre}' en {grupo.Sucursal.Nombre}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return grupo.ADto();
        }

        private async Task AplicarAsync(GrupoPantalla grupo, GuardarGrupoPantallaDto dto, CancellationToken ct)
        {
            var sucursal = await _sucursales.ObtenerPorIdAsync(dto.SucursalId, ct)
                ?? throw new ExcepcionValidacion(nameof(dto.SucursalId), "La sucursal no existe.");

            var esNuevo = grupo.Id == 0;
            if (!esNuevo && grupo.SucursalId != dto.SucursalId)
            {
                var gruposActuales = await _grupos.ListarAsync(grupo.SucursalId, ct);
                if (gruposActuales.Any(g => g.GrupoPadreId == grupo.Id))
                {
                    throw new ExcepcionConflicto("No se puede mover a otra sucursal un grupo que contiene subgrupos.");
                }
            }

            if (dto.GrupoPadreId.HasValue)
            {
                var gruposSucursal = (await _grupos.ListarAsync(dto.SucursalId, ct)).ToDictionary(g => g.Id);
                if (!gruposSucursal.ContainsKey(dto.GrupoPadreId.Value))
                {
                    throw new ExcepcionValidacion(nameof(dto.GrupoPadreId), "El grupo padre no existe en la misma sucursal.");
                }

                if (!esNuevo && JerarquiaGrupos.CreariaCiclo(grupo.Id, dto.GrupoPadreId.Value, gruposSucursal))
                {
                    throw new ExcepcionValidacion(nameof(dto.GrupoPadreId), "El grupo padre no puede ser el mismo grupo ni uno de sus subgrupos.");
                }
            }

            grupo.SucursalId = dto.SucursalId;
            grupo.Sucursal = sucursal;
            grupo.GrupoPadreId = dto.GrupoPadreId;
            grupo.Nombre = dto.Nombre.Trim();
            grupo.EstaActivo = dto.EstaActivo;
        }
    }
}
