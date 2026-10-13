using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioSucursales : RepositorioBase<Sucursal>, IRepositorioSucursales
    {
        public RepositorioSucursales(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public async Task<IReadOnlyList<Sucursal>> ListarAsync(CancellationToken ct = default) =>
            await Conjunto.OrderBy(s => s.Nombre).ToListAsync(ct);

        public Task<bool> ExisteCodigoAsync(string codigo, int? excluirId = null, CancellationToken ct = default) =>
            Conjunto.AnyAsync(s => s.Codigo == codigo && s.Id != excluirId, ct);
    }
}
