using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioListas : RepositorioBase<ListaReproduccion>, IRepositorioListas
    {
        public RepositorioListas(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public async Task<IReadOnlyList<ListaReproduccion>> ListarAsync(CancellationToken ct = default) =>
            await Conjunto.Include(l => l.Elementos).OrderBy(l => l.Nombre).ToListAsync(ct);

        public Task<ListaReproduccion?> ObtenerConElementosAsync(int id, CancellationToken ct = default) =>
            Conjunto
                .Include(l => l.Elementos).ThenInclude(e => e.Anuncio).ThenInclude(a => a.ArchivoMultimedia)
                .FirstOrDefaultAsync(l => l.Id == id, ct);
    }
}
