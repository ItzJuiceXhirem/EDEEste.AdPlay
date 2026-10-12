using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record PublicacionListaDto(
        int Id,
        int ListaReproduccionId,
        string NombreLista,
        int NumeroVersion,
        string Version,
        DateTime FechaPublicacionUtc,
        EstadoPublicacion EstadoPublicacion,
        IReadOnlyList<ElementoPublicacionDto> Elementos);

    public sealed record ElementoPublicacionDto(
        int Posicion,
        int AnuncioId,
        int ArchivoMultimediaId,
        string NombreArchivoPublicado,
        int DuracionSegundos,
        string HashSha256);

    public sealed record ExportacionDto(
        int Id,
        int PublicacionListaId,
        EstadoExportacion EstadoExportacion,
        string? HashPaquete,
        long? TamanoBytes,
        DateTime FechaSolicitudUtc,
        DateTime? FechaFinalizacionUtc,
        string? DetalleError);

    public sealed record DescargaExportacionDto(Stream Contenido, string NombreArchivo, string HashPaquete);
}
