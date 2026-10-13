using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioPantallas : IRepositorio<Pantalla>
    {
        /// <summary>Lista pantallas con su grupo, sucursal y estado técnico.</summary>
        Task<IReadOnlyList<Pantalla>> ListarAsync(int? sucursalId = null, int? grupoPantallaId = null, CancellationToken ct = default);

        /// <summary>Obtiene la pantalla con su grupo, sucursal y estado técnico.</summary>
        Task<Pantalla?> ObtenerDetalleAsync(int id, CancellationToken ct = default);

        Task<Pantalla?> ObtenerPorTokenHashAsync(string tokenHash, CancellationToken ct = default);
        Task<bool> ExisteCodigoAsync(string codigoPantalla, int? excluirId = null, CancellationToken ct = default);
    }
}
