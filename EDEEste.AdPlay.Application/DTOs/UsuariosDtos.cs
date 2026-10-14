namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record CredencialesDto(string Correo, string Clave);

    /// <summary>Datos para crear al primer administrador cuando el sistema aún no tiene usuarios.</summary>
    public sealed record RegistroInicialDto(string Correo, string NombreCompleto, string Clave);

    /// <summary>Datos de la persona autenticada que necesita la interfaz.</summary>
    /// <param name="FechaCreacionUtc">Desde cuándo existe la cuenta («Miembro desde» en Mi cuenta).</param>
    /// <param name="FotoVersion">Cambia con cada foto nueva (sirve para no usar una copia vieja); nula si no tiene foto.</param>
    public sealed record SesionDto(int Id, string Correo, string NombreCompleto, string Rol, DateTime FechaCreacionUtc, string? FotoVersion = null);

    /// <param name="FotoVersion">Ver <see cref="SesionDto.FotoVersion"/>.</param>
    public sealed record UsuarioDto(
        int Id,
        string Correo,
        string NombreCompleto,
        string Rol,
        bool EstaActivo,
        DateTime FechaCreacionUtc,
        string? FotoVersion = null);

    /// <param name="Contenido">Flujo con capacidad de búsqueda (Seek) para verificar la firma de la imagen.</param>
    public sealed record CargarFotoPerfilDto(Stream Contenido, string NombreOriginal, string TipoMime, long Longitud);

    public sealed record FotoPerfilDto(string FotoVersion);

    public sealed record ContenidoFotoPerfilDto(Stream Contenido, string TipoMime, string FotoVersion);

    public sealed record CrearUsuarioDto(string Correo, string NombreCompleto, string Rol, string Clave);

    public sealed record ActualizarUsuarioDto(string NombreCompleto, string Rol, bool EstaActivo);

    public sealed record RestablecerClaveDto(string NuevaClave);

    public sealed record CambiarClaveDto(string ClaveActual, string NuevaClave);
}
