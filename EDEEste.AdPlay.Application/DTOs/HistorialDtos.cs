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

    /// <summary>Totales del historial que cumple el filtro, sin paginar.</summary>
    /// <param name="BytesPaquetes">Suma del tamaño de los paquetes generados con éxito.</param>
    public sealed record ResumenHistorialDto(
        int Publicaciones,
        int PublicacionesRetiradas,
        DateTime? UltimaPublicacionUtc,
        string? UltimaPublicacionLista,
        int? UltimaPublicacionVersion,
        int Exportaciones,
        int ExportacionesCompletadas,
        long BytesPaquetes);
}
