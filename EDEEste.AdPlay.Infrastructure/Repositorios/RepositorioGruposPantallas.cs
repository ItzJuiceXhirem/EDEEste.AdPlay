using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioGruposPantallas : RepositorioBase<GrupoPantalla>, IRepositorioGruposPantallas
    {
        public RepositorioGruposPantallas(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public override Task<GrupoPantalla?> ObtenerPorIdAsync(int id, CancellationToken ct = default) =>
            Conjunto.Include(g => g.Sucursal).FirstOrDefaultAsync(g => g.Id == id, ct);

        public async Task<IReadOnlyList<GrupoPantalla>> ListarAsync(int? sucursalId = null, CancellationToken ct = default) =>
            await Conjunto
                .Include(g => g.Sucursal)
                .Where(g => sucursalId == null || g.SucursalId == sucursalId)
                .OrderBy(g => g.Sucursal.Nombre).ThenBy(g => g.Nombre)
                .ToListAsync(ct);
    }
}
