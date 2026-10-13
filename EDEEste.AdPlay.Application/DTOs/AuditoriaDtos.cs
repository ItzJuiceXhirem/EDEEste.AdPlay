using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record RegistroAuditoriaDto(
        int Id,
        DateTime FechaUtc,
        int? UsuarioId,
        string? NombreUsuario,
        AccionAuditoria Accion,
        string TipoEntidad,
        int? EntidadId,
        string? Detalle);
}
