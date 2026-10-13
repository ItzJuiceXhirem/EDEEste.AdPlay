using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioMultimedia : RepositorioBase<ArchivoMultimedia>, IRepositorioMultimedia
    {
        public RepositorioMultimedia(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public async Task<IReadOnlyList<ArchivoMultimedia>> ListarAsync(bool incluirArchivados = false, CancellationToken ct = default) =>
            await Conjunto
                .Where(a => incluirArchivados || !a.EstaArchivado)
                .OrderByDescending(a => a.FechaCargaUtc)
                .ToListAsync(ct);

        public Task<ArchivoMultimedia?> ObtenerPorHashAsync(string hashSha256, CancellationToken ct = default) =>
            Conjunto.FirstOrDefaultAsync(a => a.HashSha256 == hashSha256, ct);
    }
}
