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
            var consulta = Filtrar(filtro);

            var total = await consulta.CountAsync(ct);
            var registros = await consulta
                .OrderByDescending(r => r.FechaUtc).ThenByDescending(r => r.Id)
                .Skip((pagina - 1) * tamanoPagina)
                .Take(tamanoPagina)
                .ToListAsync(ct);
            return (registros, total);
        }

        public async Task<ResumenAuditoria> ResumirAsync(FiltroAuditoria filtro, CancellationToken ct = default)
        {
            var consulta = Filtrar(filtro);
            var porAccion = await consulta
                .GroupBy(r => r.Accion)
                .Select(g => new { Accion = g.Key, Cantidad = g.Count() })
                .ToDictionaryAsync(g => g.Accion, g => g.Cantidad, ct);
            var personas = await consulta
                .Where(r => r.UsuarioId != null)
                .Select(r => r.UsuarioId)
                .Distinct()
                .CountAsync(ct);

            return new ResumenAuditoria(porAccion.Values.Sum(), porAccion, personas);
        }

        private IQueryable<RegistroAuditoria> Filtrar(FiltroAuditoria filtro) =>
            _contexto.RegistrosAuditoria.AsNoTracking()
                .Where(r => filtro.DesdeUtc == null || r.FechaUtc >= filtro.DesdeUtc)
                .Where(r => filtro.HastaUtc == null || r.FechaUtc < filtro.HastaUtc)
                .Where(r => filtro.UsuarioId == null || r.UsuarioId == filtro.UsuarioId)
                .Where(r => filtro.Accion == null || r.Accion == filtro.Accion)
                .Where(r => filtro.TipoEntidad == null || r.TipoEntidad == filtro.TipoEntidad);
    }
}
