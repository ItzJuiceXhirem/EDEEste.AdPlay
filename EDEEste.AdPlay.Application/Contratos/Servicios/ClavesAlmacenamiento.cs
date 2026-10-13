namespace EDEEste.AdPlay.Application.Contratos.Servicios
{
    /// <summary>
    /// Convención de claves en <see cref="IAlmacenamientoMultimedia"/>. Siempre las genera el sistema,
    /// nunca se derivan del nombre del archivo que sube el usuario.
    /// </summary>
    public static class ClavesAlmacenamiento
    {
        public static string ParaMedio(DateTime ahoraUtc, string extension) =>
            $"medios/{ahoraUtc:yyyy}/{ahoraUtc:MM}/{Guid.NewGuid():N}{extension}";

        public static string ParaExportacion() => $"exportaciones/{Guid.NewGuid():N}.zip";
    }
}
