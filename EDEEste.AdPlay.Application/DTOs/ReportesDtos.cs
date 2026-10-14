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
    /// <param name="ElementosEsperados">Anuncios de la versión esperada, en orden de reproducción.</param>
    /// <param name="Reproduccion">
    /// Anuncio que la pantalla informó estar mostrando. Solo se incluye si está en línea y reproduce la versión esperada,
    /// para que la posición corresponda a <paramref name="ElementosEsperados"/>.
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
        string? UltimoError,
        int? NumeroVersionEsperada,
        IReadOnlyList<ElementoReproduccionDto> ElementosEsperados,
        ReproduccionReportadaDto? Reproduccion);

    public sealed record ElementoReproduccionDto(
        int Posicion,
        int AnuncioId,
        string Titulo,
        int ArchivoMultimediaId,
        TipoMultimedia TipoMultimedia,
        int DuracionSegundos);

    /// <param name="ReportadaUtc">Momento del latido; el panel estima el avance desde aquí hasta el siguiente.</param>
    public sealed record ReproduccionReportadaDto(int Posicion, int AnuncioId, int Segundo, DateTime ReportadaUtc);
}
