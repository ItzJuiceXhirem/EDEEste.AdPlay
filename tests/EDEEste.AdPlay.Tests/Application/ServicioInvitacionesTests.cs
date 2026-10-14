using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Tests.Application
{
    public class ServicioInvitacionesTests
    {
        private sealed class RelojFijo(DateTimeOffset ahora) : TimeProvider
        {
            public DateTimeOffset Ahora { get; set; } = ahora;
            public override DateTimeOffset GetUtcNow() => Ahora;
        }

        private sealed record Entorno(
            ServicioInvitaciones Servicio,
            RepositorioInvitacionesFalso Repositorio,
            GestorUsuariosFalso Gestor,
            AuditoriaFalsa Auditoria,
            RelojFijo Reloj);

        private static Entorno Crear()
        {
            var repositorio = new RepositorioInvitacionesFalso();
            var gestor = new GestorUsuariosFalso();
            var auditoria = new AuditoriaFalsa();
            var reloj = new RelojFijo(new DateTimeOffset(2026, 10, 14, 12, 0, 0, TimeSpan.Zero));
            var servicio = new ServicioInvitaciones(repositorio, gestor, auditoria, new UnidadDeTrabajoFalsa(), new UsuarioActualFalso(1), reloj);
            return new Entorno(servicio, repositorio, gestor, auditoria, reloj);
        }

        private static CrearInvitacionDto Invitacion(string correo = "carlos.pena@edeeste.com.do") =>
            new(correo, "Carlos Peña", RolesSistema.Operador);

        [Fact]
        public async Task Crear_guarda_solo_el_hash_del_token_y_vence_en_una_semana()
        {
            var e = Crear();

            var creada = await e.Servicio.CrearAsync(Invitacion());

            var guardada = Assert.Single(e.Repositorio.Invitaciones);
            Assert.NotEqual(creada.Token, guardada.TokenHash);
            Assert.Equal(64, guardada.TokenHash.Length);
            Assert.Equal(e.Reloj.Ahora.UtcDateTime.AddDays(ServicioInvitaciones.DiasVigencia), guardada.VenceUtc);
            Assert.Equal(EstadoInvitacion.Pendiente, creada.Invitacion.Estado);
            Assert.Equal(AccionAuditoria.Invitar, Assert.Single(e.Auditoria.Registros).Accion);
        }

        [Fact]
        public async Task No_se_invita_a_un_correo_que_ya_tiene_cuenta()
        {
            var e = Crear();
            await e.Gestor.CrearAsync("carlos.pena@edeeste.com.do", "Carlos Peña", RolesSistema.Operador, "Clave12345");

            await Assert.ThrowsAsync<ExcepcionConflicto>(() => e.Servicio.CrearAsync(Invitacion("CARLOS.PENA@edeeste.com.do")));
        }

        [Fact]
        public async Task Una_invitacion_nueva_al_mismo_correo_anula_el_enlace_anterior()
        {
            var e = Crear();
            var primera = await e.Servicio.CrearAsync(Invitacion());

            await e.Servicio.CrearAsync(Invitacion());

            await Assert.ThrowsAsync<ExcepcionNoEncontrado>(() => e.Servicio.ConsultarAsync(new ConsultarInvitacionDto(primera.Token)));
            Assert.Single(await e.Servicio.ListarAsync());
        }

        [Fact]
        public async Task Activar_crea_la_cuenta_con_el_rol_de_la_invitacion_y_el_enlace_no_sirve_dos_veces()
        {
            var e = Crear();
            var creada = await e.Servicio.CrearAsync(Invitacion());

            var sesion = await e.Servicio.ActivarAsync(new ActivarCuentaDto(creada.Token, "Carlos A. Peña", "Clave12345"));

            Assert.Equal("carlos.pena@edeeste.com.do", sesion.Correo);
            Assert.Equal("Carlos A. Peña", sesion.NombreCompleto);
            Assert.Equal(RolesSistema.Operador, sesion.Rol);
            Assert.Equal(EstadoInvitacion.Activada, e.Repositorio.Invitaciones[0].EstadoEn(e.Reloj.Ahora.UtcDateTime));
            Assert.Contains(e.Auditoria.Registros, r => r.Accion == AccionAuditoria.ActivarCuenta);
            await Assert.ThrowsAsync<ExcepcionNoEncontrado>(() =>
                e.Servicio.ActivarAsync(new ActivarCuentaDto(creada.Token, "Otra persona", "Clave12345")));
        }

        [Fact]
        public async Task Una_invitacion_vencida_o_anulada_no_se_puede_usar()
        {
            var e = Crear();
            var vencida = await e.Servicio.CrearAsync(Invitacion("a@edeeste.com.do"));
            var anulada = await e.Servicio.CrearAsync(Invitacion("b@edeeste.com.do"));
            await e.Servicio.RevocarAsync(anulada.Invitacion.Id);

            e.Reloj.Ahora = e.Reloj.Ahora.AddDays(ServicioInvitaciones.DiasVigencia);

            await Assert.ThrowsAsync<ExcepcionNoEncontrado>(() => e.Servicio.ConsultarAsync(new ConsultarInvitacionDto(vencida.Token)));
            await Assert.ThrowsAsync<ExcepcionNoEncontrado>(() => e.Servicio.ConsultarAsync(new ConsultarInvitacionDto(anulada.Token)));
            Assert.Equal(EstadoInvitacion.Vencida, Assert.Single(await e.Servicio.ListarAsync()).Estado);
            Assert.Empty(e.Gestor.Usuarios);
        }

        [Fact]
        public async Task Un_token_desconocido_no_revela_nada()
        {
            var e = Crear();

            var error = await Assert.ThrowsAsync<ExcepcionNoEncontrado>(() => e.Servicio.ConsultarAsync(new ConsultarInvitacionDto("inventado")));

            Assert.DoesNotContain("inventado", error.Message);
        }
    }
}
