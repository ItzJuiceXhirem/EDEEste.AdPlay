using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
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

        public Task<bool> ExisteCorreoAsync(string correo, CancellationToken ct = default) =>
            Task.FromResult(Usuarios.Values.Any(u => string.Equals(u.Correo, correo, StringComparison.OrdinalIgnoreCase)));

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

        public Dictionary<int, FotoPerfil> Fotos { get; } = [];

        public Task<FotoPerfil?> ObtenerFotoAsync(int id, CancellationToken ct = default) =>
            Task.FromResult(Fotos.GetValueOrDefault(id));

        public Task<FotoPerfil?> ReemplazarFotoAsync(int id, FotoPerfil? nueva, CancellationToken ct = default)
        {
            var anterior = Fotos.GetValueOrDefault(id);
            if (nueva is null)
            {
                Fotos.Remove(id);
            }
            else
            {
                Fotos[id] = nueva;
            }

            return Task.FromResult(anterior);
        }
    }

    /// <summary>Invitaciones en memoria; asigna el id al agregar, como haría la base al guardar.</summary>
    internal sealed class RepositorioInvitacionesFalso : IRepositorioInvitaciones
    {
        public List<Invitacion> Invitaciones { get; } = [];

        public Task<Invitacion?> ObtenerPorIdAsync(int id, CancellationToken ct = default) =>
            Task.FromResult(Invitaciones.FirstOrDefault(i => i.Id == id));

        public void Agregar(Invitacion entidad)
        {
            entidad.Id = Invitaciones.Count + 1;
            Invitaciones.Add(entidad);
        }

        public void Eliminar(Invitacion entidad) => Invitaciones.Remove(entidad);

        public Task<Invitacion?> ObtenerPorTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
            Task.FromResult(Invitaciones.FirstOrDefault(i => i.TokenHash == tokenHash));

        public Task<IReadOnlyList<Invitacion>> ListarAbiertasAsync(CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Invitacion>>(Invitaciones.Where(i => i.EstaAbierta).OrderByDescending(i => i.FechaCreacionUtc).ToList());

        public Task<IReadOnlyList<Invitacion>> ListarAbiertasPorCorreoAsync(string correo, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Invitacion>>(
                Invitaciones.Where(i => i.EstaAbierta && string.Equals(i.Correo, correo, StringComparison.OrdinalIgnoreCase)).ToList());
    }

    /// <summary>Almacenamiento en memoria: guarda el contenido por clave y permite comprobar qué se borró.</summary>
    internal sealed class AlmacenamientoFalso : IAlmacenamientoMultimedia
    {
        public Dictionary<string, byte[]> Archivos { get; } = [];

        public async Task<ResultadoAlmacenamiento> GuardarAsync(string clave, Stream contenido, CancellationToken ct = default)
        {
            using var memoria = new MemoryStream();
            await contenido.CopyToAsync(memoria, ct);
            Archivos[clave] = memoria.ToArray();
            return new ResultadoAlmacenamiento(memoria.Length, "hash");
        }

        public Task<Stream> AbrirLecturaAsync(string clave, CancellationToken ct = default) =>
            Task.FromResult<Stream>(new MemoryStream(Archivos[clave]));

        public Task<bool> ExisteAsync(string clave, CancellationToken ct = default) => Task.FromResult(Archivos.ContainsKey(clave));

        public Task EliminarAsync(string clave, CancellationToken ct = default)
        {
            Archivos.Remove(clave);
            return Task.CompletedTask;
        }
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
