using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Tests.Application
{
    /// <summary>Gestor de usuarios en memoria para probar los casos de uso sin Identity ni base de datos.</summary>
    internal sealed class GestorUsuariosFalso : IGestorUsuarios
    {
        private static readonly DateTime Fecha = new(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc);

        public Dictionary<int, UsuarioInfo> Usuarios { get; } = [];
        public ValidacionCredenciales? ResultadoCredenciales { get; set; }

        public Task<ValidacionCredenciales> ValidarCredencialesAsync(string correo, string clave, CancellationToken ct = default) =>
            Task.FromResult(ResultadoCredenciales ?? throw new InvalidOperationException("Configure ResultadoCredenciales."));

        public Task<UsuarioInfo?> ObtenerAsync(int id, CancellationToken ct = default) =>
            Task.FromResult(Usuarios.GetValueOrDefault(id));

        public Task<IReadOnlyList<UsuarioInfo>> ListarAsync(CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<UsuarioInfo>>(Usuarios.Values.ToList());

        public Task<bool> ExistenUsuariosAsync(CancellationToken ct = default) =>
            Task.FromResult(Usuarios.Count > 0);

        public Task<int> ContarAdministradoresActivosAsync(CancellationToken ct = default) =>
            Task.FromResult(Usuarios.Values.Count(u => u.Rol == RolesSistema.Administrador && u.EstaActivo));

        public Task<UsuarioInfo> CrearAsync(string correo, string nombreCompleto, string rol, string clave, CancellationToken ct = default)
        {
            var usuario = new UsuarioInfo(Usuarios.Count + 1, correo, nombreCompleto, rol, true, Fecha);
            Usuarios[usuario.Id] = usuario;
            return Task.FromResult(usuario);
        }

        public Task ActualizarAsync(int id, string nombreCompleto, string rol, bool estaActivo, CancellationToken ct = default)
        {
            Usuarios[id] = Usuarios[id] with { NombreCompleto = nombreCompleto, Rol = rol, EstaActivo = estaActivo };
            return Task.CompletedTask;
        }

        public Task RestablecerClaveAsync(int id, string nuevaClave, CancellationToken ct = default) => Task.CompletedTask;

        public Task<bool> CambiarClaveAsync(int id, string claveActual, string nuevaClave, CancellationToken ct = default) =>
            Task.FromResult(claveActual == "correcta");

        public Task<IReadOnlyDictionary<int, string>> ObtenerNombresAsync(IEnumerable<int> ids, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyDictionary<int, string>>(new Dictionary<int, string>());
    }

    internal sealed class AuditoriaFalsa : IRegistroAuditoria
    {
        public List<(AccionAuditoria Accion, string Tipo, int? Id, string? Detalle)> Registros { get; } = [];

        public void Registrar(AccionAuditoria accion, EntidadBase entidad, string? detalle = null) =>
            Registros.Add((accion, entidad.GetType().Name, entidad.Id, detalle));

        public void Registrar(AccionAuditoria accion, string tipoEntidad, int? entidadId, string? detalle = null, int? usuarioId = null) =>
            Registros.Add((accion, tipoEntidad, entidadId, detalle));
    }

    internal sealed class UnidadDeTrabajoFalsa : IUnidadDeTrabajo
    {
        public int Guardados { get; private set; }

        public Task GuardarCambiosAsync(CancellationToken ct = default)
        {
            Guardados++;
            return Task.CompletedTask;
        }
    }

    internal sealed class UsuarioActualFalso(int? id) : IUsuarioActual
    {
        public bool EstaAutenticado => id.HasValue;
        public int? Id => id;
        public string? Nombre => "Actual";
    }
}
