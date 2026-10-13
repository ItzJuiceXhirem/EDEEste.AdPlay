using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioPantallas : RepositorioBase<Pantalla>, IRepositorioPantallas
    {
        public RepositorioPantallas(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public async Task<IReadOnlyList<Pantalla>> ListarAsync(int? sucursalId = null, int? grupoPantallaId = null, CancellationToken ct = default) =>
            await ConDetalle()
                .Where(p => sucursalId == null || p.GrupoPantalla.SucursalId == sucursalId)
                .Where(p => grupoPantallaId == null || p.GrupoPantallaId == grupoPantallaId)
                .OrderBy(p => p.GrupoPantalla.Sucursal.Nombre).ThenBy(p => p.GrupoPantalla.Nombre).ThenBy(p => p.Nombre)
                .ToListAsync(ct);

        public Task<Pantalla?> ObtenerDetalleAsync(int id, CancellationToken ct = default) =>
            ConDetalle().FirstOrDefaultAsync(p => p.Id == id, ct);

        public Task<Pantalla?> ObtenerPorTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
            ConDetalle().FirstOrDefaultAsync(p => p.TokenDispositivoHash == tokenHash, ct);

        public Task<bool> ExisteCodigoAsync(string codigoPantalla, int? excluirId = null, CancellationToken ct = default) =>
            Conjunto.AnyAsync(p => p.CodigoPantalla == codigoPantalla && p.Id != excluirId, ct);

        private IQueryable<Pantalla> ConDetalle() =>
            Conjunto
                .Include(p => p.GrupoPantalla).ThenInclude(g => g.Sucursal)
                .Include(p => p.Estado);
    }
}
