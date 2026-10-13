namespace EDEEste.AdPlay.Application.Contratos.Servicios
{
    /// <summary>
    /// Estructura del ZIP de exportación para reproducción local. El sistema de reproducción local depende de estos nombres.
    /// </summary>
    public static class FormatoPaquete
    {
        public const string NombreManifiesto = "manifest.json";
        public const string NombreVersion = "version.txt";
        public const string CarpetaMedios = "medios";

        public static string RutaMedio(string nombreArchivoPublicado) => $"{CarpetaMedios}/{nombreArchivoPublicado}";
    }
}
