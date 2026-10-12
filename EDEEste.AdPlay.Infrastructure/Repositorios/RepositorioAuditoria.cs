using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    /// <summary>
    /// Solo lectura: los registros se crean con <see cref="Auditoria.RegistroAuditoriaEf"/> y no se modifican ni se borran.
    /// </summary>
    public class RepositorioAuditoria : IRepositorioAuditoria
    {
        private readonly ContextoPublicidad _contexto;

        public RepositorioAuditoria(ContextoPublicidad contexto)
        {
            _contexto = contexto;
        }

        public async Task<(IReadOnlyList<RegistroAuditoria> Registros, int Total)> ListarAsync(
            FiltroAuditoria filtro, int pagina, int tamanoPagina, CancellationToken ct = default)
        {
            var consulta = _contexto.RegistrosAuditoria.AsNoTracking()
                .Where(r => filtro.DesdeUtc == null || r.FechaUtc >= filtro.DesdeUtc)
                .Where(r => filtro.HastaUtc == null || r.FechaUtc < filtro.HastaUtc)
                .Where(r => filtro.UsuarioId == null || r.UsuarioId == filtro.UsuarioId)
                .Where(r => filtro.Accion == null || r.Accion == filtro.Accion)
                .Where(r => filtro.TipoEntidad == null || r.TipoEntidad == filtro.TipoEntidad);

            var total = await consulta.CountAsync(ct);
            var registros = await consulta
                .OrderByDescending(r => r.FechaUtc).ThenByDescending(r => r.Id)
                .Skip((pagina - 1) * tamanoPagina)
                .Take(tamanoPagina)
                .ToListAsync(ct);
            return (registros, total);
        }
    }
}
