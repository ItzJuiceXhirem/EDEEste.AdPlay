using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record ArchivoMultimediaDto(
        int Id,
        string NombreOriginal,
        TipoMultimedia TipoMultimedia,
        string TipoMime,
        long TamanoBytes,
        string HashSha256,
        int? Ancho,
        int? Alto,
        int? DuracionSegundos,
        DateTime FechaCargaUtc,
        bool EstaArchivado);

    /// <param name="Contenido">Flujo con capacidad de búsqueda (Seek) para verificar la firma del archivo.</param>
    public sealed record CargarArchivoMultimediaDto(
        Stream Contenido,
        string NombreOriginal,
        string TipoMime,
        long Longitud,
        int? DuracionSegundos);

    public sealed record CambiarArchivadoDto(bool EstaArchivado);

    public sealed record ContenidoArchivoDto(
        Stream Contenido,
        string TipoMime,
        string HashSha256);

    public sealed record AnuncioDto(
        int Id,
        string Titulo,
        string? Descripcion,
        int ArchivoMultimediaId,
        string NombreArchivo,
        TipoMultimedia TipoMultimedia,
        int DuracionPredeterminadaSegundos,
        bool EstaActivo,
        DateTime FechaCreacionUtc);

    public sealed record GuardarAnuncioDto(
        string Titulo,
        string? Descripcion,
        int ArchivoMultimediaId,
        int DuracionPredeterminadaSegundos,
        bool EstaActivo = true);
}
