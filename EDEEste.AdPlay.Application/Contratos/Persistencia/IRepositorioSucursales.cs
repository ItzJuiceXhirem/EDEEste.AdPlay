using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioSucursales : IRepositorio<Sucursal>
    {
        Task<IReadOnlyList<Sucursal>> ListarAsync(CancellationToken ct = default);
        Task<bool> ExisteCodigoAsync(string codigo, int? excluirId = null, CancellationToken ct = default);
    }
}
