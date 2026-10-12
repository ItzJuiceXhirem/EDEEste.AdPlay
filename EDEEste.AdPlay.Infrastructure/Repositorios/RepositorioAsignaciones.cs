using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public class RepositorioAsignaciones : RepositorioBase<AsignacionLista>, IRepositorioAsignaciones
    {
        public RepositorioAsignaciones(ContextoPublicidad contexto) : base(contexto)
        {
        }

        public override Task<AsignacionLista?> ObtenerPorIdAsync(int id, CancellationToken ct = default) =>
            ConDetalle().FirstOrDefaultAsync(a => a.Id == id, ct);

        public async Task<IReadOnlyList<AsignacionLista>> ListarAsync(int? listaReproduccionId = null, CancellationToken ct = default) =>
            await ConDetalle()
                .Where(a => listaReproduccionId == null || a.ListaReproduccionId == listaReproduccionId)
                .OrderBy(a => a.ListaReproduccion.Nombre).ThenBy(a => a.Id)
                .ToListAsync(ct);

        public async Task<IReadOnlyList<AsignacionLista>> ListarHabilitadasAsync(CancellationToken ct = default) =>
            await Conjunto
                .Include(a => a.ListaReproduccion)
                .Include(a => a.ReglasHorario)
                .Where(a => a.EstaHabilitada)
                .ToListAsync(ct);

        public async Task<IReadOnlyList<AsignacionLista>> ListarHabilitadasMismoDestinoAsync(AsignacionLista asignacion, CancellationToken ct = default) =>
            await Conjunto
                .Include(a => a.ListaReproduccion)
                .Include(a => a.ReglasHorario)
                .Where(a => a.EstaHabilitada
                    && a.SucursalId == asignacion.SucursalId
                    && a.GrupoPantallaId == asignacion.GrupoPantallaId
                    && a.PantallaId == asignacion.PantallaId)
                .ToListAsync(ct);

        public async Task<IReadOnlyList<AsignacionLista>> ListarHabilitadasParaDestinosAsync(
            int pantallaId, IReadOnlyCollection<int> grupoPantallaIds, int sucursalId, CancellationToken ct = default)
        {
            var grupos = grupoPantallaIds.ToList();
            return await Conjunto
                .Include(a => a.ListaReproduccion)
                .Include(a => a.ReglasHorario)
                .Where(a => a.EstaHabilitada
                    && (a.PantallaId == pantallaId
                        || (a.GrupoPantallaId != null && grupos.Contains(a.GrupoPantallaId.Value))
                        || a.SucursalId == sucursalId))
                .ToListAsync(ct);
        }

        private IQueryable<AsignacionLista> ConDetalle() =>
            Conjunto
                .Include(a => a.ListaReproduccion)
                .Include(a => a.Sucursal)
                .Include(a => a.GrupoPantalla)
                .Include(a => a.Pantalla)
                .Include(a => a.ReglasHorario);
    }
}
