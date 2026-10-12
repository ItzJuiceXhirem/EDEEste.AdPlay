using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Paquete ZIP generado a partir de una publicación para el modo de reproducción local.
    /// </summary>
    public class Exportacion : EntidadBase
    {
        public int PublicacionListaId { get; set; }
        public EstadoExportacion EstadoExportacion { get; set; } = EstadoExportacion.Pendiente;
        public string? ClaveAlmacenamiento { get; set; }
        public string? HashPaquete { get; set; }
        public long? TamanoBytes { get; set; }
        public DateTime FechaSolicitudUtc { get; set; }
        public DateTime? FechaFinalizacionUtc { get; set; }
        public int? UsuarioSolicitanteId { get; set; }
        public string? DetalleError { get; set; }

        public PublicacionLista PublicacionLista { get; set; } = null!;
    }
}
