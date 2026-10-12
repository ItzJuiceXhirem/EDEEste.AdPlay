namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record CredencialesDto(string Correo, string Clave);

    /// <summary>Datos para crear al primer administrador cuando el sistema aún no tiene usuarios.</summary>
    public sealed record RegistroInicialDto(string Correo, string NombreCompleto, string Clave);

    /// <summary>Datos de la persona autenticada que necesita la interfaz.</summary>
    public sealed record SesionDto(int Id, string Correo, string NombreCompleto, string Rol);

    public sealed record UsuarioDto(
        int Id,
        string Correo,
        string NombreCompleto,
        string Rol,
        bool EstaActivo,
        DateTime FechaCreacionUtc);

    public sealed record CrearUsuarioDto(string Correo, string NombreCompleto, string Rol, string Clave);

    public sealed record ActualizarUsuarioDto(string NombreCompleto, string Rol, bool EstaActivo);

    public sealed record RestablecerClaveDto(string NuevaClave);

    public sealed record CambiarClaveDto(string ClaveActual, string NuevaClave);
}
