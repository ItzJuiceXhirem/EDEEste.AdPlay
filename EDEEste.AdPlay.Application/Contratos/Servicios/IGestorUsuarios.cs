namespace EDEEste.AdPlay.Application.Contratos.Servicios
{
    public sealed record UsuarioInfo(
        int Id,
        string Correo,
        string NombreCompleto,
        string Rol,
        bool EstaActivo,
        DateTime FechaCreacionUtc);

    public enum ResultadoCredenciales
    {
        Correcto = 0,
        Invalido = 1,
        Bloqueado = 2,
        Inactivo = 3
    }

    public sealed record ValidacionCredenciales(ResultadoCredenciales Resultado, UsuarioInfo? Usuario);

    /// <summary>
    /// Almacén de usuarios y credenciales. Lo implementa Infrastructure con ASP.NET Core Identity; Application
    /// no conoce Identity. Los errores de datos (clave débil, correo duplicado) se lanzan como ExcepcionValidacion.
    /// </summary>
    public interface IGestorUsuarios
    {
        /// <summary>Comprueba la clave contando los intentos fallidos y aplicando el bloqueo temporal.</summary>
        Task<ValidacionCredenciales> ValidarCredencialesAsync(string correo, string clave, CancellationToken ct = default);

        Task<UsuarioInfo?> ObtenerAsync(int id, CancellationToken ct = default);
        Task<IReadOnlyList<UsuarioInfo>> ListarAsync(CancellationToken ct = default);
        Task<int> ContarAdministradoresActivosAsync(CancellationToken ct = default);

        /// <summary>Indica si ya hay al menos un usuario (activo o no).</summary>
        Task<bool> ExistenUsuariosAsync(CancellationToken ct = default);

        Task<UsuarioInfo> CrearAsync(string correo, string nombreCompleto, string rol, string clave, CancellationToken ct = default);
        Task ActualizarAsync(int id, string nombreCompleto, string rol, bool estaActivo, CancellationToken ct = default);
        Task RestablecerClaveAsync(int id, string nuevaClave, CancellationToken ct = default);

        /// <returns>Falso si la clave actual no es correcta.</returns>
        Task<bool> CambiarClaveAsync(int id, string claveActual, string nuevaClave, CancellationToken ct = default);

        /// <summary>Nombre para mostrar de cada usuario; los ids desconocidos se omiten.</summary>
        Task<IReadOnlyDictionary<int, string>> ObtenerNombresAsync(IEnumerable<int> ids, CancellationToken ct = default);
    }
}
