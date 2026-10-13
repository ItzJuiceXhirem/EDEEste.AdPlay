using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Tests.Application
{
    public class ServicioAutenticacionTests
    {
        private static (ServicioAutenticacion Servicio, GestorUsuariosFalso Gestor, AuditoriaFalsa Auditoria) Crear()
        {
            var gestor = new GestorUsuariosFalso();
            var auditoria = new AuditoriaFalsa();
            return (new ServicioAutenticacion(gestor, auditoria, new UnidadDeTrabajoFalsa()), gestor, auditoria);
        }

        [Fact]
        public async Task El_registro_inicial_esta_disponible_solo_sin_usuarios()
        {
            var (servicio, gestor, _) = Crear();
            Assert.True(await servicio.RegistroInicialDisponibleAsync());

            await gestor.CrearAsync("a@adplay.local", "A", RolesSistema.Operador, "Clave2026Segura");

            Assert.False(await servicio.RegistroInicialDisponibleAsync());
        }

        [Fact]
        public async Task El_registro_inicial_crea_un_administrador_y_lo_audita()
        {
            var (servicio, gestor, auditoria) = Crear();

            var sesion = await servicio.RegistrarAdministradorInicialAsync(
                new RegistroInicialDto(" admin@adplay.local ", " Admin ", "Clave2026Segura"));

            Assert.Equal(RolesSistema.Administrador, sesion.Rol);
            Assert.Equal("admin@adplay.local", sesion.Correo);
            Assert.Single(gestor.Usuarios);
            Assert.Equal(AccionAuditoria.Crear, Assert.Single(auditoria.Registros).Accion);
        }

        [Fact]
        public async Task El_registro_inicial_se_rechaza_si_ya_hay_usuarios_y_no_crea_nada()
        {
            var (servicio, gestor, auditoria) = Crear();
            await gestor.CrearAsync("a@adplay.local", "A", RolesSistema.Administrador, "Clave2026Segura");

            await Assert.ThrowsAsync<ExcepcionConflicto>(() =>
                servicio.RegistrarAdministradorInicialAsync(new RegistroInicialDto("otro@adplay.local", "Otro", "Clave2026Segura")));

            Assert.Single(gestor.Usuarios);
            Assert.Empty(auditoria.Registros);
        }

        [Theory]
        [InlineData("no-es-correo", "Nombre", "Clave2026Segura")]
        [InlineData("a@adplay.local", "", "Clave2026Segura")]
        [InlineData("a@adplay.local", "Nombre", "")]
        public async Task El_registro_inicial_valida_los_datos(string correo, string nombre, string clave)
        {
            var (servicio, gestor, _) = Crear();

            await Assert.ThrowsAsync<ExcepcionValidacion>(() =>
                servicio.RegistrarAdministradorInicialAsync(new RegistroInicialDto(correo, nombre, clave)));
            Assert.Empty(gestor.Usuarios);
        }

        [Fact]
        public async Task Dos_registros_simultaneos_crean_un_solo_administrador()
        {
            var (servicio, gestor, _) = Crear();

            var resultados = await Task.WhenAll(Enumerable.Range(0, 8).Select(async i =>
            {
                try
                {
                    await servicio.RegistrarAdministradorInicialAsync(new RegistroInicialDto($"u{i}@adplay.local", $"U{i}", "Clave2026Segura"));
                    return true;
                }
                catch (ExcepcionConflicto)
                {
                    return false;
                }
            }));

            Assert.Equal(1, resultados.Count(creado => creado));
            Assert.Single(gestor.Usuarios);
        }

        [Fact]
        public async Task Iniciar_sesion_con_credenciales_incorrectas_no_revela_si_la_cuenta_existe()
        {
            var (servicio, gestor, auditoria) = Crear();
            gestor.ResultadoCredenciales = new ValidacionCredenciales(ResultadoCredenciales.Invalido, null);

            var error = await Assert.ThrowsAsync<ExcepcionNoAutorizado>(() =>
                servicio.IniciarSesionAsync(new CredencialesDto("x@adplay.local", "mala")));

            Assert.Equal("Correo o contraseña incorrectos.", error.Message);
            Assert.Equal(AccionAuditoria.InicioSesionFallido, Assert.Single(auditoria.Registros).Accion);
        }
    }
}
