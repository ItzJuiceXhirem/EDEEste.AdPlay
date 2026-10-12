using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Tests.Application
{
    public class ServicioUsuariosTests
    {
        private static readonly DateTime Fecha = new(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc);

        private sealed class GestorFalso : IGestorUsuarios
        {
            public Dictionary<int, UsuarioInfo> Usuarios { get; } = [];

            public Task<ValidacionCredenciales> ValidarCredencialesAsync(string correo, string clave, CancellationToken ct = default) =>
                throw new NotSupportedException();

            public Task<UsuarioInfo?> ObtenerAsync(int id, CancellationToken ct = default) =>
                Task.FromResult(Usuarios.GetValueOrDefault(id));

            public Task<IReadOnlyList<UsuarioInfo>> ListarAsync(CancellationToken ct = default) =>
                Task.FromResult<IReadOnlyList<UsuarioInfo>>(Usuarios.Values.ToList());

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

        private sealed class AuditoriaFalsa : IRegistroAuditoria
        {
            public List<(AccionAuditoria Accion, string Tipo, int? Id, string? Detalle)> Registros { get; } = [];

            public void Registrar(AccionAuditoria accion, EntidadBase entidad, string? detalle = null) =>
                Registros.Add((accion, entidad.GetType().Name, entidad.Id, detalle));

            public void Registrar(AccionAuditoria accion, string tipoEntidad, int? entidadId, string? detalle = null, int? usuarioId = null) =>
                Registros.Add((accion, tipoEntidad, entidadId, detalle));
        }

        private sealed class UnidadDeTrabajoFalsa : IUnidadDeTrabajo
        {
            public int Guardados { get; private set; }

            public Task GuardarCambiosAsync(CancellationToken ct = default)
            {
                Guardados++;
                return Task.CompletedTask;
            }
        }

        private sealed class UsuarioActualFalso(int? id) : IUsuarioActual
        {
            public bool EstaAutenticado => id.HasValue;
            public int? Id => id;
            public string? Nombre => "Actual";
        }

        private static (ServicioUsuarios Servicio, GestorFalso Gestor, AuditoriaFalsa Auditoria, UnidadDeTrabajoFalsa Unidad) Crear(int? usuarioActualId = 1)
        {
            var gestor = new GestorFalso();
            var auditoria = new AuditoriaFalsa();
            var unidad = new UnidadDeTrabajoFalsa();
            return (new ServicioUsuarios(gestor, auditoria, unidad, new UsuarioActualFalso(usuarioActualId)), gestor, auditoria, unidad);
        }

        private static UsuarioInfo Usuario(int id, string rol, bool activo = true) =>
            new(id, $"u{id}@adplay.local", $"Usuario {id}", rol, activo, Fecha);

        [Fact]
        public async Task Crear_registra_la_accion_en_auditoria_sin_incluir_la_clave()
        {
            var (servicio, _, auditoria, unidad) = Crear();

            await servicio.CrearAsync(new CrearUsuarioDto("nuevo@adplay.local", "Nuevo", RolesSistema.Operador, "ClaveSecreta2026"), default);

            var registro = Assert.Single(auditoria.Registros);
            Assert.Equal(AccionAuditoria.Crear, registro.Accion);
            Assert.DoesNotContain("ClaveSecreta2026", registro.Detalle);
            Assert.Equal(1, unidad.Guardados);
        }

        [Theory]
        [InlineData("no-es-correo", "Nombre", "Operador")]
        [InlineData("Nombre <a@b.com>", "Nombre", "Operador")]
        [InlineData("a@b.com", "", "Operador")]
        [InlineData("a@b.com", "Nombre", "SuperUsuario")]
        public async Task Crear_rechaza_datos_no_validos(string correo, string nombre, string rol)
        {
            var (servicio, gestor, _, _) = Crear();

            await Assert.ThrowsAsync<ExcepcionValidacion>(() =>
                servicio.CrearAsync(new CrearUsuarioDto(correo, nombre, rol, "ClaveSecreta2026"), default));
            Assert.Empty(gestor.Usuarios);
        }

        [Fact]
        public async Task No_se_puede_degradar_ni_desactivar_al_unico_administrador_activo()
        {
            var (servicio, gestor, _, _) = Crear(usuarioActualId: 9);
            gestor.Usuarios[1] = Usuario(1, RolesSistema.Administrador);

            await Assert.ThrowsAsync<ExcepcionConflicto>(() =>
                servicio.ActualizarAsync(1, new ActualizarUsuarioDto("Usuario 1", RolesSistema.Operador, true), default));
            await Assert.ThrowsAsync<ExcepcionConflicto>(() =>
                servicio.ActualizarAsync(1, new ActualizarUsuarioDto("Usuario 1", RolesSistema.Administrador, false), default));
        }

        [Fact]
        public async Task Se_puede_degradar_a_un_administrador_si_queda_otro_activo()
        {
            var (servicio, gestor, auditoria, _) = Crear(usuarioActualId: 2);
            gestor.Usuarios[1] = Usuario(1, RolesSistema.Administrador);
            gestor.Usuarios[2] = Usuario(2, RolesSistema.Administrador);

            await servicio.ActualizarAsync(1, new ActualizarUsuarioDto("Usuario 1", RolesSistema.Operador, true), default);

            Assert.Equal(RolesSistema.Operador, gestor.Usuarios[1].Rol);
            Assert.Equal(AccionAuditoria.Editar, Assert.Single(auditoria.Registros).Accion);
        }

        [Fact]
        public async Task Nadie_puede_desactivar_su_propia_cuenta()
        {
            var (servicio, gestor, _, _) = Crear(usuarioActualId: 2);
            gestor.Usuarios[1] = Usuario(1, RolesSistema.Administrador);
            gestor.Usuarios[2] = Usuario(2, RolesSistema.Administrador);

            await Assert.ThrowsAsync<ExcepcionConflicto>(() =>
                servicio.ActualizarAsync(2, new ActualizarUsuarioDto("Usuario 2", RolesSistema.Administrador, false), default));
        }

        [Fact]
        public async Task Desactivar_a_otro_usuario_se_audita_como_Deshabilitar()
        {
            var (servicio, gestor, auditoria, _) = Crear(usuarioActualId: 1);
            gestor.Usuarios[1] = Usuario(1, RolesSistema.Administrador);
            gestor.Usuarios[2] = Usuario(2, RolesSistema.Operador);

            await servicio.ActualizarAsync(2, new ActualizarUsuarioDto("Usuario 2", RolesSistema.Operador, false), default);

            Assert.Equal(AccionAuditoria.Deshabilitar, Assert.Single(auditoria.Registros).Accion);
        }

        [Fact]
        public async Task Cambiar_clave_exige_sesion_y_la_clave_actual_correcta()
        {
            var (sinSesion, _, _, _) = Crear(usuarioActualId: null);
            await Assert.ThrowsAsync<ExcepcionNoAutorizado>(() =>
                sinSesion.CambiarClaveAsync(new CambiarClaveDto("correcta", "Nueva2026Clave"), default));

            var (servicio, _, auditoria, _) = Crear(usuarioActualId: 1);
            await Assert.ThrowsAsync<ExcepcionValidacion>(() =>
                servicio.CambiarClaveAsync(new CambiarClaveDto("incorrecta", "Nueva2026Clave"), default));
            Assert.Empty(auditoria.Registros);

            await servicio.CambiarClaveAsync(new CambiarClaveDto("correcta", "Nueva2026Clave"), default);
            Assert.Equal(AccionAuditoria.CambiarClave, Assert.Single(auditoria.Registros).Accion);
        }
    }
}
