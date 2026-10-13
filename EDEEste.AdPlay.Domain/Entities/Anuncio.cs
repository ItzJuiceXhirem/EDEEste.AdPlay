using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Domain.Entities
{
    public class Anuncio : EntidadBase
    {
        public string Titulo { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public int ArchivoMultimediaId { get; set; }
        public int DuracionPredeterminadaSegundos { get; set; }
        public bool EstaActivo { get; set; } = true;
        public DateTime FechaCreacionUtc { get; set; }
        public int? UsuarioCreadorId { get; set; }

        public ArchivoMultimedia ArchivoMultimedia { get; set; } = null!;
    }
}
