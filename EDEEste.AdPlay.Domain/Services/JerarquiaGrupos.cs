using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Domain.Services
{
    /// <summary>
    /// Reglas del árbol de grupos de pantallas de una sucursal.
    /// </summary>
    public static class JerarquiaGrupos
    {
        /// <summary>
        /// Devuelve el grupo indicado seguido de sus ancestros, del más cercano al más lejano.
        /// Ignora referencias a grupos desconocidos y se detiene si encuentra un ciclo.
        /// </summary>
        public static IReadOnlyList<int> ObtenerCadena(int grupoId, IReadOnlyDictionary<int, GrupoPantalla> gruposPorId)
        {
            var cadena = new List<int>();
            int? actual = grupoId;
            while (actual.HasValue && !cadena.Contains(actual.Value) && gruposPorId.TryGetValue(actual.Value, out var grupo))
            {
                cadena.Add(grupo.Id);
                actual = grupo.GrupoPadreId;
            }

            return cadena;
        }

        /// <summary>
        /// Indica si asignar <paramref name="nuevoPadreId"/> como padre de <paramref name="grupoId"/> crearía un ciclo
        /// (el nuevo padre es el propio grupo o uno de sus descendientes).
        /// </summary>
        public static bool CreariaCiclo(int grupoId, int nuevoPadreId, IReadOnlyDictionary<int, GrupoPantalla> gruposPorId) =>
            ObtenerCadena(nuevoPadreId, gruposPorId).Contains(grupoId);
    }
}
