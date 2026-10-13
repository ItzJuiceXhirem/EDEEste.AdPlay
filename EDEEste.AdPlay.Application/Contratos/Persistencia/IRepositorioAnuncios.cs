using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioAnuncios : IRepositorio<Anuncio>
    {
        /// <summary>Lista anuncios con su archivo multimedia.</summary>
        Task<IReadOnlyList<Anuncio>> ListarAsync(CancellationToken ct = default);

        /// <summary>Obtiene los anuncios indicados con su archivo multimedia.</summary>
        Task<IReadOnlyList<Anuncio>> ObtenerVariosAsync(IEnumerable<int> ids, CancellationToken ct = default);
    }
}
