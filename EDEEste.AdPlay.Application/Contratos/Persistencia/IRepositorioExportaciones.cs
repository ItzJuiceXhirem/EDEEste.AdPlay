using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioExportaciones : IRepositorio<Exportacion>
    {
        Task<IReadOnlyList<Exportacion>> ListarPorPublicacionAsync(int publicacionListaId, CancellationToken ct = default);

        /// <summary>Obtiene la exportación con su publicación y lista.</summary>
        Task<Exportacion?> ObtenerDetalleAsync(int id, CancellationToken ct = default);

        /// <summary>Historial paginado, más reciente primero, con su publicación y lista cargadas.</summary>
        Task<(IReadOnlyList<Exportacion> Exportaciones, int Total)> ListarHistorialAsync(
            FiltroHistorial filtro, int pagina, int tamanoPagina, CancellationToken ct = default);
    }
}
