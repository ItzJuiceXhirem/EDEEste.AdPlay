using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioGruposPantallas : IRepositorio<GrupoPantalla>
    {
        Task<IReadOnlyList<GrupoPantalla>> ListarAsync(int? sucursalId = null, CancellationToken ct = default);
    }
}
