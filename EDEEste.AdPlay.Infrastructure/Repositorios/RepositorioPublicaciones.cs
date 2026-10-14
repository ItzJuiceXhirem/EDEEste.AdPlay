using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioPublicaciones : RepositorioBase<PublicacionLista>, IRepositorioPublicaciones
    {
        public RepositorioPublicaciones(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public async Task<IReadOnlyList<PublicacionLista>> ListarPorListaAsync(int listaReproduccionId, CancellationToken ct = default) =>
            await Conjunto
                .Include(p => p.ListaReproduccion)
                .Include(p => p.Elementos)
                .Where(p => p.ListaReproduccionId == listaReproduccionId)
                .OrderByDescending(p => p.NumeroVersion)
                .AsSplitQuery()
                .ToListAsync(ct);

        public Task<PublicacionLista?> ObtenerConElementosAsync(int id, CancellationToken ct = default) =>
            ConElementos().FirstOrDefaultAsync(p => p.Id == id, ct);

        public Task<PublicacionLista?> ObtenerUltimaPublicadaAsync(int listaReproduccionId, CancellationToken ct = default) =>
            ConElementos()
                .Where(p => p.ListaReproduccionId == listaReproduccionId && p.EstadoPublicacion == EstadoPublicacion.Publicada)
                .OrderByDescending(p => p.NumeroVersion)
                .FirstOrDefaultAsync(ct);

        public async Task<int> ObtenerUltimoNumeroVersionAsync(int listaReproduccionId, CancellationToken ct = default) =>
            await Conjunto
                .Where(p => p.ListaReproduccionId == listaReproduccionId)
                .MaxAsync(p => (int?)p.NumeroVersion, ct) ?? 0;

        public async Task<(IReadOnlyList<PublicacionLista> Publicaciones, int Total)> ListarHistorialAsync(
            FiltroHistorial filtro, int pagina, int tamanoPagina, CancellationToken ct = default)
        {
            var consulta = FiltrarHistorial(filtro);

            var total = await consulta.CountAsync(ct);
            var publicaciones = await consulta
                .Include(p => p.ListaReproduccion)
                .Include(p => p.Elementos)
                .OrderByDescending(p => p.FechaPublicacionUtc).ThenByDescending(p => p.Id)
                .Skip((pagina - 1) * tamanoPagina)
                .Take(tamanoPagina)
                .AsSplitQuery()
                .AsNoTracking()
                .ToListAsync(ct);
            return (publicaciones, total);
        }

        public async Task<IReadOnlyList<PublicacionLista>> ListarUltimasPublicadasAsync(
            IEnumerable<int> listaReproduccionIds, CancellationToken ct = default)
        {
            var ids = listaReproduccionIds.ToList();
            var ultimas = await Conjunto
                .Where(p => ids.Contains(p.ListaReproduccionId) && p.EstadoPublicacion == EstadoPublicacion.Publicada)
                .GroupBy(p => p.ListaReproduccionId)
                .Select(g => g.OrderByDescending(p => p.NumeroVersion)
                    .Select(p => new { p.Id, p.ListaReproduccionId, p.NumeroVersion, p.FechaPublicacionUtc, NombreLista = p.ListaReproduccion.Nombre })
                    .First())
                .ToListAsync(ct);

            // Entidades de solo lectura, sin seguimiento ni elementos: bastan para identificar la versión.
            return ultimas
                .Select(u => new PublicacionLista
                {
                    Id = u.Id,
                    ListaReproduccionId = u.ListaReproduccionId,
                    NumeroVersion = u.NumeroVersion,
                    FechaPublicacionUtc = u.FechaPublicacionUtc,
                    ListaReproduccion = new ListaReproduccion { Id = u.ListaReproduccionId, Nombre = u.NombreLista }
                })
                .ToList();
        }

        public async Task<IReadOnlyList<ElementoPublicacion>> ListarElementosAsync(
            IEnumerable<int> publicacionIds, CancellationToken ct = default)
        {
            var ids = publicacionIds.Distinct().ToList();
            if (ids.Count == 0)
            {
                return [];
            }

            return await Contexto.ElementosPublicacion
                .Include(e => e.Anuncio)
                .Include(e => e.ArchivoMultimedia)
                .Where(e => ids.Contains(e.PublicacionListaId))
                .OrderBy(e => e.PublicacionListaId).ThenBy(e => e.Posicion)
                .AsNoTracking()
                .ToListAsync(ct);
        }

        public async Task<ResumenPublicaciones> ResumirHistorialAsync(FiltroHistorial filtro, CancellationToken ct = default)
        {
            var consulta = FiltrarHistorial(filtro);
            var porEstado = await consulta
                .GroupBy(p => p.EstadoPublicacion)
                .Select(g => new { Estado = g.Key, Cantidad = g.Count() })
                .ToListAsync(ct);
            var ultima = await consulta
                .Include(p => p.ListaReproduccion)
                .OrderByDescending(p => p.FechaPublicacionUtc).ThenByDescending(p => p.Id)
                .AsNoTracking()
                .FirstOrDefaultAsync(ct);

            return new ResumenPublicaciones(
                porEstado.Sum(e => e.Cantidad),
                porEstado.Where(e => e.Estado == EstadoPublicacion.Retirada).Sum(e => e.Cantidad),
                ultima);
        }

        private IQueryable<PublicacionLista> FiltrarHistorial(FiltroHistorial filtro) =>
            Conjunto
                .Where(p => filtro.ListaReproduccionId == null || p.ListaReproduccionId == filtro.ListaReproduccionId)
                .Where(p => filtro.DesdeUtc == null || p.FechaPublicacionUtc >= filtro.DesdeUtc)
                .Where(p => filtro.HastaUtc == null || p.FechaPublicacionUtc < filtro.HastaUtc);

        private IQueryable<PublicacionLista> ConElementos() =>
            Conjunto
                .Include(p => p.ListaReproduccion)
                .Include(p => p.Elementos).ThenInclude(e => e.ArchivoMultimedia)
                .Include(p => p.Elementos).ThenInclude(e => e.Anuncio)
                .AsSplitQuery();
    }
}
