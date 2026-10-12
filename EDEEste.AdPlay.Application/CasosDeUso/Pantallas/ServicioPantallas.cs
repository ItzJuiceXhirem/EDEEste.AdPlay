using EDEEste.AdPlay.Application.Comunes;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.Application.CasosDeUso.Pantallas
{
    public class ServicioPantallas
    {
        private readonly IRepositorioPantallas _pantallas;
        private readonly IRepositorioGruposPantallas _grupos;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;
        private readonly TimeProvider _reloj;
        private readonly OpcionesReproductor _opciones;

        public ServicioPantallas(
            IRepositorioPantallas pantallas,
            IRepositorioGruposPantallas grupos,
            IUnidadDeTrabajo unidadDeTrabajo,
            IRegistroAuditoria auditoria,
            TimeProvider reloj,
            IOptions<OpcionesReproductor> opciones)
        {
            _pantallas = pantallas;
            _grupos = grupos;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
            _reloj = reloj;
            _opciones = opciones.Value;
        }

        public async Task<IReadOnlyList<PantallaDto>> ListarAsync(int? sucursalId, int? grupoPantallaId, CancellationToken ct = default) =>
            (await _pantallas.ListarAsync(sucursalId, grupoPantallaId, ct)).Select(ADto).ToList();

        public async Task<PantallaDto> ObtenerAsync(int id, CancellationToken ct = default) =>
            ADto(await ObtenerEntidadAsync(id, ct));

        public async Task<PantallaDto> RegistrarAsync(RegistrarPantallaDto dto, CancellationToken ct = default)
        {
            ValidadorPantallas.Validar(dto);
            var codigo = dto.CodigoPantalla.NormalizarCodigo();
            await VerificarCodigoUnicoAsync(codigo, null, ct);

            var pantalla = new Pantalla
            {
                CodigoPantalla = codigo,
                Nombre = dto.Nombre.Trim(),
                Modelo = dto.Modelo.ANuloSiVacio(),
                NumeroSerie = dto.NumeroSerie.ANuloSiVacio(),
                GrupoPantalla = await ObtenerGrupoAsync(dto.GrupoPantallaId, ct),
                GrupoPantallaId = dto.GrupoPantallaId,
                ModoReproduccion = dto.ModoReproduccion,
                EstaHabilitada = true,
                FechaCreacionUtc = _reloj.GetUtcNow().UtcDateTime
            };

            _pantallas.Agregar(pantalla);
            _auditoria.Registrar(AccionAuditoria.Crear, pantalla, $"Pantalla '{pantalla.Nombre}' ({pantalla.CodigoPantalla})");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return ADto(pantalla);
        }

        public async Task<PantallaDto> ActualizarAsync(int id, ActualizarPantallaDto dto, CancellationToken ct = default)
        {
            ValidadorPantallas.Validar(dto);
            var pantalla = await ObtenerEntidadAsync(id, ct);
            var estabaHabilitada = pantalla.EstaHabilitada;

            if (dto.CodigoPantalla is not null)
            {
                var codigo = dto.CodigoPantalla.NormalizarCodigo();
                await VerificarCodigoUnicoAsync(codigo, id, ct);
                pantalla.CodigoPantalla = codigo;
            }

            if (dto.GrupoPantallaId.HasValue && dto.GrupoPantallaId != pantalla.GrupoPantallaId)
            {
                pantalla.GrupoPantalla = await ObtenerGrupoAsync(dto.GrupoPantallaId.Value, ct);
                pantalla.GrupoPantallaId = dto.GrupoPantallaId.Value;
            }

            // Un campo de texto con valor vacío se interpreta como "borrar"; null significa "no cambiar".
            pantalla.Nombre = dto.Nombre?.Trim() ?? pantalla.Nombre;
            pantalla.Modelo = dto.Modelo is null ? pantalla.Modelo : dto.Modelo.ANuloSiVacio();
            pantalla.NumeroSerie = dto.NumeroSerie is null ? pantalla.NumeroSerie : dto.NumeroSerie.ANuloSiVacio();
            pantalla.ModoReproduccion = dto.ModoReproduccion ?? pantalla.ModoReproduccion;
            pantalla.EstaHabilitada = dto.EstaHabilitada ?? pantalla.EstaHabilitada;

            _auditoria.Registrar(
                AuditoriaExtensions.AccionDeEdicion(estabaHabilitada, pantalla.EstaHabilitada),
                pantalla,
                $"Pantalla '{pantalla.Nombre}' ({pantalla.CodigoPantalla})");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return ADto(pantalla);
        }

        /// <summary>
        /// Genera (o rota) el token del dispositivo. El anterior deja de ser válido inmediatamente.
        /// </summary>
        public async Task<TokenDispositivoDto> GenerarTokenAsync(int id, CancellationToken ct = default)
        {
            var pantalla = await ObtenerEntidadAsync(id, ct);
            var token = TokensDispositivo.Generar();
            pantalla.TokenDispositivoHash = TokensDispositivo.CalcularHash(token);

            // El detalle nunca incluye el token.
            _auditoria.Registrar(AccionAuditoria.GenerarToken, pantalla, $"Pantalla '{pantalla.Nombre}'");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return new TokenDispositivoDto(pantalla.Id, token);
        }

        public async Task RevocarTokenAsync(int id, CancellationToken ct = default)
        {
            var pantalla = await ObtenerEntidadAsync(id, ct);
            pantalla.TokenDispositivoHash = null;
            _auditoria.Registrar(AccionAuditoria.RevocarToken, pantalla, $"Pantalla '{pantalla.Nombre}'");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
        }

        private PantallaDto ADto(Pantalla pantalla) =>
            pantalla.ADto(pantalla.CalcularEstadoOperativo(_reloj.GetUtcNow().UtcDateTime, _opciones.VentanaDesconexion));

        private async Task<Pantalla> ObtenerEntidadAsync(int id, CancellationToken ct) =>
            await _pantallas.ObtenerDetalleAsync(id, ct) ?? throw new ExcepcionNoEncontrado("la pantalla", id);

        private async Task<GrupoPantalla> ObtenerGrupoAsync(int grupoPantallaId, CancellationToken ct) =>
            await _grupos.ObtenerPorIdAsync(grupoPantallaId, ct)
                ?? throw new ExcepcionValidacion(nameof(Pantalla.GrupoPantallaId), "El grupo de pantallas no existe.");

        private async Task VerificarCodigoUnicoAsync(string codigo, int? excluirId, CancellationToken ct)
        {
            if (await _pantallas.ExisteCodigoAsync(codigo, excluirId, ct))
            {
                throw new ExcepcionConflicto($"Ya existe una pantalla con el código '{codigo}'.");
            }
        }
    }
}
