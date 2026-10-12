using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record HistorialPublicacionDto(
        int Id,
        int ListaReproduccionId,
        string NombreLista,
        int NumeroVersion,
        string Version,
        DateTime FechaPublicacionUtc,
        EstadoPublicacion EstadoPublicacion,
        int CantidadElementos,
        string? UsuarioPublicador);

    public sealed record HistorialExportacionDto(
        int Id,
        int PublicacionListaId,
        string NombreLista,
        int NumeroVersion,
        EstadoExportacion EstadoExportacion,
        long? TamanoBytes,
        string? HashPaquete,
        DateTime FechaSolicitudUtc,
        DateTime? FechaFinalizacionUtc,
        string? UsuarioSolicitante,
        string? DetalleError);
}
