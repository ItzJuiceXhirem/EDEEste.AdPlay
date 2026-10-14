using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioInvitaciones : IRepositorio<Invitacion>
    {
        Task<Invitacion?> ObtenerPorTokenHashAsync(string tokenHash, CancellationToken ct = default);

        /// <summary>Las que no se usaron ni se revocaron (vigentes y vencidas), más recientes primero.</summary>
        Task<IReadOnlyList<Invitacion>> ListarAbiertasAsync(CancellationToken ct = default);

        Task<IReadOnlyList<Invitacion>> ListarAbiertasPorCorreoAsync(string correo, CancellationToken ct = default);
    }
}
