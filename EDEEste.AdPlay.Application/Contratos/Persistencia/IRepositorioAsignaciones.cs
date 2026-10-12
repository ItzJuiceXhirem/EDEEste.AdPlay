using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorioAsignaciones : IRepositorio<AsignacionLista>
    {
        /// <summary>Lista asignaciones con su lista y destino.</summary>
        Task<IReadOnlyList<AsignacionLista>> ListarAsync(int? listaReproduccionId = null, CancellationToken ct = default);

        /// <summary>Todas las asignaciones habilitadas, con su lista y sus horarios (para reportes).</summary>
        Task<IReadOnlyList<AsignacionLista>> ListarHabilitadasAsync(CancellationToken ct = default);

        /// <summary>Asignaciones habilitadas que apuntan al mismo destino que la indicada.</summary>
        Task<IReadOnlyList<AsignacionLista>> ListarHabilitadasMismoDestinoAsync(AsignacionLista asignacion, CancellationToken ct = default);

        /// <summary>Asignaciones habilitadas, con su lista, dirigidas a cualquiera de los destinos indicados.</summary>
        Task<IReadOnlyList<AsignacionLista>> ListarHabilitadasParaDestinosAsync(
            int pantallaId, IReadOnlyCollection<int> grupoPantallaIds, int sucursalId, CancellationToken ct = default);
    }
}
