using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    /// <summary>
    /// Manifiesto que consume el reproductor web y que se incluye como manifest.json en los paquetes ZIP.
    /// </summary>
    /// <param name="CodigoPantalla">Nulo en paquetes exportados, que no pertenecen a una pantalla concreta.</param>
    /// <param name="Version">Nulo si la pantalla no tiene contenido publicado o está deshabilitada.</param>
    public sealed record ManifiestoDto(
        int FormatoManifiesto,
        string? CodigoPantalla,
        bool Habilitada,
        string? Version,
        int? PublicacionId,
        int? NumeroVersion,
        string? NombreLista,
        DateTime GeneradoUtc,
        int IntervaloConsultaSegundos,
        IReadOnlyList<ElementoManifiestoDto> Elementos)
    {
        public const int FormatoActual = 1;
    }

    /// <param name="Ruta">Ruta relativa del medio dentro del paquete; nula en el reproductor web, que usa ArchivoMultimediaId.</param>
    public sealed record ElementoManifiestoDto(
        int Posicion,
        int AnuncioId,
        string Titulo,
        int ArchivoMultimediaId,
        string NombreArchivo,
        string? Ruta,
        TipoMultimedia TipoMultimedia,
        string TipoMime,
        int DuracionSegundos,
        long TamanoBytes,
        string HashSha256);

    public sealed record LatidoDto(string? VersionReportada, string? Error);
}
