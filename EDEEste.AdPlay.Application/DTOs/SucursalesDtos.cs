namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record SucursalDto(
        int Id,
        string Codigo,
        string Nombre,
        string ZonaHorariaId,
        bool EstaActiva,
        DateTime FechaCreacionUtc);

    public sealed record GuardarSucursalDto(
        string Codigo,
        string Nombre,
        string? ZonaHorariaId,
        bool EstaActiva = true);

    public sealed record GrupoPantallaDto(
        int Id,
        int SucursalId,
        string NombreSucursal,
        int? GrupoPadreId,
        string Nombre,
        bool EstaActivo);

    public sealed record GuardarGrupoPantallaDto(
        int SucursalId,
        int? GrupoPadreId,
        string Nombre,
        bool EstaActivo = true);
}
