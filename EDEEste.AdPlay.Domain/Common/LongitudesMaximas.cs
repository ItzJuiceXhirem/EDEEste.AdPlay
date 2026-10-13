namespace EDEEste.AdPlay.Domain.Common
{
    /// <summary>
    /// Longitudes máximas de texto. Las comparten las validaciones (Application) y el esquema de la base de datos
    /// (Infrastructure), de modo que cambiarlas aquí mantiene ambos lados alineados.
    /// Un cambio de valor requiere una migración.
    /// </summary>
    public static class LongitudesMaximas
    {
        /// <summary>Longitud de las columnas de texto que no declaran una propia.</summary>
        public const int Predeterminada = 200;

        public const int Codigo = 30;
        public const int CodigoPantalla = 50;
        public const int Nombre = 100;
        public const int Modelo = 100;
        public const int NumeroSerie = 100;
        public const int Titulo = 150;
        public const int Descripcion = 500;
        public const int NombreArchivo = 255;
        public const int NombreArchivoPublicado = 100;
        public const int ClaveAlmacenamiento = 300;
        public const int TipoMime = 100;
        public const int ZonaHoraria = 64;
        public const int VersionReportada = 50;
        public const int DetalleError = 1000;
        public const int DetalleAuditoria = 1000;
        public const int TipoEntidad = 50;
        public const int NombreCompleto = 150;
        public const int Correo = 256;

        /// <summary>SHA-256 en hexadecimal.</summary>
        public const int HashSha256 = 64;

        /// <summary>Valores de enumeraciones guardados como texto.</summary>
        public const int Enumeracion = 30;
    }
}
