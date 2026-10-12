using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioListas : IRepositorio<ListaReproduccion>
    {
        Task<IReadOnlyList<ListaReproduccion>> ListarAsync(CancellationToken ct = default);

        /// <summary>Obtiene la lista con sus elementos, anuncios y archivos multimedia.</summary>
        Task<ListaReproduccion?> ObtenerConElementosAsync(int id, CancellationToken ct = default);
    }
}
