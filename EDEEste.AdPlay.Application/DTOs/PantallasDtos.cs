using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record PantallaDto(
        int Id,
        string CodigoPantalla,
        string Nombre,
        string? Modelo,
        string? NumeroSerie,
        int GrupoPantallaId,
        string NombreGrupo,
        int SucursalId,
        string NombreSucursal,
        ModoReproduccion ModoReproduccion,
        bool EstaHabilitada,
        DateTime FechaCreacionUtc,
        bool TieneTokenDispositivo,
        EstadoOperativoPantalla EstadoOperativo,
        DateTime? UltimaConexionUtc,
        string? UltimaVersionReportada,
        string? UltimoError);

    public sealed record RegistrarPantallaDto(
        string CodigoPantalla,
        string Nombre,
        string? Modelo,
        string? NumeroSerie,
        int GrupoPantallaId,
        ModoReproduccion ModoReproduccion = ModoReproduccion.NavegadorWeb);

    /// <summary>Actualización parcial: solo se modifican los campos con valor.</summary>
    public sealed record ActualizarPantallaDto(
        string? CodigoPantalla,
        string? Nombre,
        string? Modelo,
        string? NumeroSerie,
        int? GrupoPantallaId,
        ModoReproduccion? ModoReproduccion,
        bool? EstaHabilitada);

    /// <summary>El token en claro solo se devuelve una vez, al generarlo.</summary>
    public sealed record TokenDispositivoDto(int PantallaId, string Token);
}
