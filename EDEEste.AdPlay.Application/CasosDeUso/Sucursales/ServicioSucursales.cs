using EDEEste.AdPlay.Application.Comunes;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.CasosDeUso.Sucursales
{
    public class ServicioSucursales
    {
        private readonly IRepositorioSucursales _sucursales;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;
        private readonly TimeProvider _reloj;

        public ServicioSucursales(IRepositorioSucursales sucursales, IUnidadDeTrabajo unidadDeTrabajo, IRegistroAuditoria auditoria, TimeProvider reloj)
        {
            _sucursales = sucursales;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
            _reloj = reloj;
        }

        public async Task<IReadOnlyList<SucursalDto>> ListarAsync(CancellationToken ct = default) =>
            (await _sucursales.ListarAsync(ct)).Select(s => s.ADto()).ToList();

        public async Task<SucursalDto> ObtenerAsync(int id, CancellationToken ct = default) =>
            (await ObtenerEntidadAsync(id, ct)).ADto();

        public async Task<SucursalDto> CrearAsync(GuardarSucursalDto dto, CancellationToken ct = default)
        {
            ValidadorSucursales.Validar(dto);
            var codigo = dto.Codigo.NormalizarCodigo();
            await VerificarCodigoUnicoAsync(codigo, null, ct);

            var sucursal = new Sucursal
            {
                Codigo = codigo,
                Nombre = dto.Nombre.Trim(),
                ZonaHorariaId = dto.ZonaHorariaId ?? ZonasHorarias.Predeterminada,
                EstaActiva = dto.EstaActiva,
                FechaCreacionUtc = _reloj.GetUtcNow().UtcDateTime
            };

            _sucursales.Agregar(sucursal);
            _auditoria.Registrar(AccionAuditoria.Crear, sucursal, $"Sucursal '{sucursal.Nombre}' ({sucursal.Codigo})");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return sucursal.ADto();
        }

        public async Task<SucursalDto> ActualizarAsync(int id, GuardarSucursalDto dto, CancellationToken ct = default)
        {
            ValidadorSucursales.Validar(dto);
            var sucursal = await ObtenerEntidadAsync(id, ct);
            var codigo = dto.Codigo.NormalizarCodigo();
            await VerificarCodigoUnicoAsync(codigo, id, ct);

            var estabaActiva = sucursal.EstaActiva;
            sucursal.Codigo = codigo;
            sucursal.Nombre = dto.Nombre.Trim();
            sucursal.ZonaHorariaId = dto.ZonaHorariaId ?? sucursal.ZonaHorariaId;
            sucursal.EstaActiva = dto.EstaActiva;

            _auditoria.Registrar(
                AuditoriaExtensions.AccionDeEdicion(estabaActiva, sucursal.EstaActiva),
                sucursal,
                $"Sucursal '{sucursal.Nombre}' ({sucursal.Codigo})");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return sucursal.ADto();
        }

        private async Task<Sucursal> ObtenerEntidadAsync(int id, CancellationToken ct) =>
            await _sucursales.ObtenerPorIdAsync(id, ct) ?? throw new ExcepcionNoEncontrado("la sucursal", id);

        private async Task VerificarCodigoUnicoAsync(string codigo, int? excluirId, CancellationToken ct)
        {
            if (await _sucursales.ExisteCodigoAsync(codigo, excluirId, ct))
            {
                throw new ExcepcionConflicto($"Ya existe una sucursal con el código '{codigo}'.");
            }
        }
    }
}
