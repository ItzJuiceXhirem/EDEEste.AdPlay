using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioInvitaciones : RepositorioBase<Invitacion>, IRepositorioInvitaciones
    {
        public RepositorioInvitaciones(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public Task<Invitacion?> ObtenerPorTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
            Conjunto.FirstOrDefaultAsync(i => i.TokenHash == tokenHash, ct);

        public async Task<IReadOnlyList<Invitacion>> ListarAbiertasAsync(CancellationToken ct = default) =>
            await Abiertas()
                .OrderByDescending(i => i.FechaCreacionUtc)
                .AsNoTracking()
                .ToListAsync(ct);

        // La intercalación de SQL Server no distingue mayúsculas, igual que el correo de Identity.
        public async Task<IReadOnlyList<Invitacion>> ListarAbiertasPorCorreoAsync(string correo, CancellationToken ct = default) =>
            await Abiertas().Where(i => i.Correo == correo).ToListAsync(ct);

        private IQueryable<Invitacion> Abiertas() =>
            Conjunto.Where(i => i.FechaActivacionUtc == null && i.FechaRevocacionUtc == null);
    }
}
