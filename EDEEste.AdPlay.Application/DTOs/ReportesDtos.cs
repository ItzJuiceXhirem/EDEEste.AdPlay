using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    /// <summary>
    /// Estado operativo de una pantalla frente a lo que debería estar reproduciendo.
    /// </summary>
    /// <param name="VersionEsperada">Versión que el servidor entregaría ahora; nula si no tiene contenido aplicable.</param>
    /// <param name="Actualizada">
    /// Verdadero si la versión reportada coincide con la esperada. Nulo si no se puede saber
    /// (pantalla sin latidos, sin contenido esperado o en modo paquete local).
    /// </param>
    public sealed record EstadoPantallaReporteDto(
        int PantallaId,
        string CodigoPantalla,
        string Nombre,
        int SucursalId,
        string NombreSucursal,
        int GrupoPantallaId,
        string NombreGrupo,
        ModoReproduccion ModoReproduccion,
        bool EstaHabilitada,
        EstadoOperativoPantalla EstadoOperativo,
        DateTime? UltimaConexionUtc,
        string? NombreListaEsperada,
        string? VersionEsperada,
        string? VersionReportada,
        bool? Actualizada,
        string? UltimoError);
}
