using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioAnuncios : RepositorioBase<Anuncio>, IRepositorioAnuncios
    {
        public RepositorioAnuncios(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public override Task<Anuncio?> ObtenerPorIdAsync(int id, CancellationToken ct = default) =>
            Conjunto.Include(a => a.ArchivoMultimedia).FirstOrDefaultAsync(a => a.Id == id, ct);

        public async Task<IReadOnlyList<Anuncio>> ListarAsync(CancellationToken ct = default) =>
            await Conjunto.Include(a => a.ArchivoMultimedia).OrderBy(a => a.Titulo).ToListAsync(ct);

        public async Task<IReadOnlyList<Anuncio>> ObtenerVariosAsync(IEnumerable<int> ids, CancellationToken ct = default)
        {
            var lista = ids.ToList();
            return await Conjunto.Include(a => a.ArchivoMultimedia).Where(a => lista.Contains(a.Id)).ToListAsync(ct);
        }
    }
}
