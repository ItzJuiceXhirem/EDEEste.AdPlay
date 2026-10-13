using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Domain.Services
{
    /// <summary>
    /// Decide qué asignaciones aplican a una pantalla y en qué orden de prioridad:
    /// pantalla, luego el grupo más cercano hacia arriba en la jerarquía, luego la sucursal.
    /// </summary>
    public static class ResolutorAsignaciones
    {
        /// <param name="asignaciones">Asignaciones habilitadas con su lista y sus horarios cargados; se descartan las que no apuntan a la pantalla.</param>
        /// <param name="cadenaGrupos">Grupo de la pantalla seguido de sus ancestros (ver <see cref="JerarquiaGrupos"/>).</param>
        /// <returns>Candidatas activas ahora (vigencia y horario) con lista activa, de mayor a menor prioridad.</returns>
        public static IReadOnlyList<AsignacionLista> ObtenerCandidatas(
            IEnumerable<AsignacionLista> asignaciones,
            int pantallaId,
            int sucursalId,
            IReadOnlyList<int> cadenaGrupos,
            DateTime ahoraUtc) =>
            asignaciones
                .Where(a => ApuntaA(a, pantallaId, sucursalId, cadenaGrupos))
                .Where(a => a.EstaActivaEn(ahoraUtc) && a.ListaReproduccion.EstaActiva)
                .OrderBy(a => Prioridad(a, cadenaGrupos))
                .ThenByDescending(a => a.FechaCreacionUtc)
                .ToList();

        private static bool ApuntaA(AsignacionLista asignacion, int pantallaId, int sucursalId, IReadOnlyList<int> cadenaGrupos) =>
            asignacion.PantallaId == pantallaId
            || (asignacion.GrupoPantallaId is int grupoId && cadenaGrupos.Contains(grupoId))
            || asignacion.SucursalId == sucursalId;

        /// <summary>Menor valor = mayor prioridad.</summary>
        private static int Prioridad(AsignacionLista asignacion, IReadOnlyList<int> cadenaGrupos) => asignacion.Nivel switch
        {
            NivelAsignacion.Pantalla => 0,
            NivelAsignacion.GrupoPantalla => 1 + IndiceEnCadena(cadenaGrupos, asignacion.GrupoPantallaId!.Value),
            _ => int.MaxValue
        };

        private static int IndiceEnCadena(IReadOnlyList<int> cadena, int grupoId)
        {
            for (var i = 0; i < cadena.Count; i++)
            {
                if (cadena[i] == grupoId)
                {
                    return i;
                }
            }

            return cadena.Count;
        }
    }
}
