using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record CrearInvitacionDto(string Correo, string NombreCompleto, string Rol);

    /// <param name="Invitador">Nombre de quien la creó; nulo si su cuenta ya no existe.</param>
    public sealed record InvitacionDto(
        int Id,
        string Correo,
        string NombreCompleto,
        string Rol,
        EstadoInvitacion Estado,
        DateTime FechaCreacionUtc,
        DateTime VenceUtc,
        string? Invitador);

    /// <param name="Token">Se entrega una sola vez; con él se arma el enlace de activación.</param>
    public sealed record InvitacionCreadaDto(InvitacionDto Invitacion, string Token);

    public sealed record ConsultarInvitacionDto(string Token);

    /// <summary>Lo que ve la persona invitada antes de activar su cuenta.</summary>
    public sealed record InvitacionPublicaDto(string Correo, string NombreCompleto, string Rol, string? Invitador, DateTime VenceUtc);

    public sealed record ActivarCuentaDto(string Token, string NombreCompleto, string Clave);
}
