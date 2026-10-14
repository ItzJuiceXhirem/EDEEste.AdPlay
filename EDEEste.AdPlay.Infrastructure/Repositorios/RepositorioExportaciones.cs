using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioExportaciones : RepositorioBase<Exportacion>, IRepositorioExportaciones
    {
        public RepositorioExportaciones(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public async Task<IReadOnlyList<Exportacion>> ListarPorPublicacionAsync(int publicacionListaId, CancellationToken ct = default) =>
            await Conjunto
                .Where(e => e.PublicacionListaId == publicacionListaId)
                .OrderByDescending(e => e.FechaSolicitudUtc)
                .ToListAsync(ct);

        public async Task<(IReadOnlyList<Exportacion> Exportaciones, int Total)> ListarHistorialAsync(
            FiltroHistorial filtro, int pagina, int tamanoPagina, CancellationToken ct = default)
        {
            var consulta = FiltrarHistorial(filtro);

            var total = await consulta.CountAsync(ct);
            var exportaciones = await consulta
                .Include(e => e.PublicacionLista).ThenInclude(p => p.ListaReproduccion)
                .OrderByDescending(e => e.FechaSolicitudUtc).ThenByDescending(e => e.Id)
                .Skip((pagina - 1) * tamanoPagina)
                .Take(tamanoPagina)
                .AsNoTracking()
                .ToListAsync(ct);
            return (exportaciones, total);
        }

        public Task<Exportacion?> ObtenerDetalleAsync(int id, CancellationToken ct = default) =>
            Conjunto
                .Include(e => e.PublicacionLista).ThenInclude(p => p.ListaReproduccion)
                .FirstOrDefaultAsync(e => e.Id == id, ct);

        public async Task<ResumenExportaciones> ResumirHistorialAsync(FiltroHistorial filtro, CancellationToken ct = default)
        {
            var porEstado = await FiltrarHistorial(filtro)
                .GroupBy(e => e.EstadoExportacion)
                .Select(g => new { Estado = g.Key, Cantidad = g.Count(), Bytes = g.Sum(e => e.TamanoBytes ?? 0) })
                .ToListAsync(ct);
            var completadas = porEstado.Where(e => e.Estado == EstadoExportacion.Completada).ToList();

            return new ResumenExportaciones(
                porEstado.Sum(e => e.Cantidad),
                completadas.Sum(e => e.Cantidad),
                completadas.Sum(e => e.Bytes));
        }

        private IQueryable<Exportacion> FiltrarHistorial(FiltroHistorial filtro) =>
            Conjunto
                .Where(e => filtro.ListaReproduccionId == null || e.PublicacionLista.ListaReproduccionId == filtro.ListaReproduccionId)
                .Where(e => filtro.DesdeUtc == null || e.FechaSolicitudUtc >= filtro.DesdeUtc)
                .Where(e => filtro.HastaUtc == null || e.FechaSolicitudUtc < filtro.HastaUtc);
    }
}
