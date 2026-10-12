using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Versión inmutable de una lista. Editar la lista después no altera una versión ya publicada.
    /// </summary>
    public class PublicacionLista : EntidadBase
    {
        public int ListaReproduccionId { get; set; }
        public int NumeroVersion { get; set; }
        public DateTime FechaPublicacionUtc { get; set; }
        public int? UsuarioPublicadorId { get; set; }
        public EstadoPublicacion EstadoPublicacion { get; set; } = EstadoPublicacion.Publicada;

        public ListaReproduccion ListaReproduccion { get; set; } = null!;
        public ICollection<ElementoPublicacion> Elementos { get; set; } = new List<ElementoPublicacion>();
        public ICollection<Exportacion> Exportaciones { get; set; } = new List<Exportacion>();

        /// <summary>Identificador de versión que reportan y comparan los reproductores.</summary>
        public string IdentificadorVersion => $"{Id}.{NumeroVersion}";
    }
}
