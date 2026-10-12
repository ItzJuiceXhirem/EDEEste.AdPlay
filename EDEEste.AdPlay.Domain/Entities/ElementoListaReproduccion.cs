using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Colocación de un anuncio dentro de una lista. (ListaReproduccionId, Posicion) es única.
    /// </summary>
    public class ElementoListaReproduccion : EntidadBase
    {
        public int ListaReproduccionId { get; set; }
        public int AnuncioId { get; set; }
        public int Posicion { get; set; }
        public int? DuracionPersonalizadaSegundos { get; set; }

        public ListaReproduccion ListaReproduccion { get; set; } = null!;
        public Anuncio Anuncio { get; set; } = null!;

        /// <summary>La duración personalizada sobrescribe la predeterminada del anuncio.</summary>
        public int DuracionEfectivaSegundos => DuracionPersonalizadaSegundos ?? Anuncio.DuracionPredeterminadaSegundos;
    }
}
