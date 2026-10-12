using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Metadatos de un medio almacenado fuera de SQL Server. Es inmutable: un cambio de contenido es un archivo nuevo.
    /// </summary>
    public class ArchivoMultimedia : EntidadBase
    {
        public string NombreOriginal { get; set; } = string.Empty;

        /// <summary>Clave generada por el sistema; nunca se deriva del nombre original.</summary>
        public string ClaveAlmacenamiento { get; set; } = string.Empty;

        public TipoMultimedia TipoMultimedia { get; set; }
        public string TipoMime { get; set; } = string.Empty;
        public long TamanoBytes { get; set; }
        public string HashSha256 { get; set; } = string.Empty;
        public int? Ancho { get; set; }
        public int? Alto { get; set; }
        public int? DuracionSegundos { get; set; }
        public DateTime FechaCargaUtc { get; set; }
        public int? UsuarioCargaId { get; set; }

        /// <summary>Los medios referenciados no se borran físicamente; se archivan.</summary>
        public bool EstaArchivado { get; set; }

        public ICollection<Anuncio> Anuncios { get; set; } = new List<Anuncio>();
    }
}
