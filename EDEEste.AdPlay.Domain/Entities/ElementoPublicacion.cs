using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Instantánea de un anuncio dentro de una versión publicada: medio, orden, duración y hash.
    /// </summary>
    public class ElementoPublicacion : EntidadBase
    {
        public int PublicacionListaId { get; set; }
        public int AnuncioId { get; set; }
        public int ArchivoMultimediaId { get; set; }
        public string NombreArchivoPublicado { get; set; } = string.Empty;
        public int Posicion { get; set; }
        public int DuracionSegundos { get; set; }
        public string HashSha256 { get; set; } = string.Empty;

        public PublicacionLista PublicacionLista { get; set; } = null!;
        public Anuncio Anuncio { get; set; } = null!;
        public ArchivoMultimedia ArchivoMultimedia { get; set; } = null!;
    }
}
