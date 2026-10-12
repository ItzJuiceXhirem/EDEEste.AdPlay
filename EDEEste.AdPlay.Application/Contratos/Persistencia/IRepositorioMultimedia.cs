using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioMultimedia : IRepositorio<ArchivoMultimedia>
    {
        Task<IReadOnlyList<ArchivoMultimedia>> ListarAsync(bool incluirArchivados = false, CancellationToken ct = default);
        Task<ArchivoMultimedia?> ObtenerPorHashAsync(string hashSha256, CancellationToken ct = default);
    }
}
