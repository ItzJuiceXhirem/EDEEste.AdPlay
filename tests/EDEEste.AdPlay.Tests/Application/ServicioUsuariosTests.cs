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

        private static (ServicioUsuarios Servicio, GestorUsuariosFalso Gestor, AuditoriaFalsa Auditoria, UnidadDeTrabajoFalsa Unidad) Crear(int? usuarioActualId = 1)
        {
            var gestor = new GestorUsuariosFalso();
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
