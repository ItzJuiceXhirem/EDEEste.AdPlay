using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;

namespace EDEEste.AdPlay.Application.CasosDeUso.Auditoria
{
    public class ServicioAuditoria
    {
        private readonly IRepositorioAuditoria _repositorio;
        private readonly IGestorUsuarios _gestorUsuarios;

        public ServicioAuditoria(IRepositorioAuditoria repositorio, IGestorUsuarios gestorUsuarios)
        {
            _repositorio = repositorio;
            _gestorUsuarios = gestorUsuarios;
        }

        public async Task<PaginaDto<RegistroAuditoriaDto>> ListarAsync(
            FiltroAuditoria filtro, int? pagina, int? tamanoPagina, CancellationToken ct = default)
        {
            var (paginaActual, tamano) = Paginacion.Normalizar(pagina, tamanoPagina);
            var (registros, total) = await _repositorio.ListarAsync(filtro, paginaActual, tamano, ct);

            var ids = registros.Where(r => r.UsuarioId.HasValue).Select(r => r.UsuarioId!.Value).Distinct();
            var nombres = await _gestorUsuarios.ObtenerNombresAsync(ids, ct);

            var elementos = registros
                .Select(r => new RegistroAuditoriaDto(
                    r.Id,
                    r.FechaUtc,
                    r.UsuarioId,
                    r.UsuarioId.HasValue ? nombres.GetValueOrDefault(r.UsuarioId.Value) : null,
                    r.Accion,
                    r.TipoEntidad,
                    r.EntidadId,
                    r.Detalle))
                .ToList();
            return new PaginaDto<RegistroAuditoriaDto>(elementos, total, paginaActual, tamano);
        }
    }
}
