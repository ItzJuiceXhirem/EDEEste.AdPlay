using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioPublicaciones : IRepositorio<PublicacionLista>
    {
        Task<IReadOnlyList<PublicacionLista>> ListarPorListaAsync(int listaReproduccionId, CancellationToken ct = default);

        /// <summary>Obtiene la publicación con su lista, elementos y archivos multimedia.</summary>
        Task<PublicacionLista?> ObtenerConElementosAsync(int id, CancellationToken ct = default);

        /// <summary>Última versión en estado Publicada de la lista, con elementos y archivos multimedia.</summary>
        Task<PublicacionLista?> ObtenerUltimaPublicadaAsync(int listaReproduccionId, CancellationToken ct = default);

        Task<int> ObtenerUltimoNumeroVersionAsync(int listaReproduccionId, CancellationToken ct = default);

        /// <summary>Historial paginado, más reciente primero, con lista y elementos cargados.</summary>
        Task<(IReadOnlyList<PublicacionLista> Publicaciones, int Total)> ListarHistorialAsync(
            FiltroHistorial filtro, int pagina, int tamanoPagina, CancellationToken ct = default);

        /// <summary>
        /// Última versión en estado Publicada de cada lista indicada, con su lista cargada y sin elementos.
        /// Las listas sin versión publicada se omiten.
        /// </summary>
        Task<IReadOnlyList<PublicacionLista>> ListarUltimasPublicadasAsync(IEnumerable<int> listaReproduccionIds, CancellationToken ct = default);
    }
}
