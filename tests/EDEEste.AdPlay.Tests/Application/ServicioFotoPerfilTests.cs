using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Domain.Enums;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.Tests.Application
{
    public class ServicioFotoPerfilTests
    {
        private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4, 5, 6, 7, 8];
        private static readonly byte[] Mp4 = [0, 0, 0, 0x18, (byte)'f', (byte)'t', (byte)'y', (byte)'p', 1, 2, 3, 4, 5, 6, 7, 8];

        private sealed class RelojFijo(DateTimeOffset ahora) : TimeProvider
        {
            public DateTimeOffset Ahora { get; set; } = ahora;
            public override DateTimeOffset GetUtcNow() => Ahora;
        }

        private sealed record Entorno(
            ServicioFotoPerfil Servicio,
            GestorUsuariosFalso Gestor,
            AlmacenamientoFalso Almacenamiento,
            AuditoriaFalsa Auditoria,
            RelojFijo Reloj);

        private static Entorno Crear(int? usuarioActualId = 1)
        {
            var gestor = new GestorUsuariosFalso();
            var almacenamiento = new AlmacenamientoFalso();
            var auditoria = new AuditoriaFalsa();
            var reloj = new RelojFijo(new DateTimeOffset(2026, 10, 13, 12, 0, 0, TimeSpan.Zero));
            var servicio = new ServicioFotoPerfil(
                gestor,
                almacenamiento,
                auditoria,
                new UnidadDeTrabajoFalsa(),
                new UsuarioActualFalso(usuarioActualId),
                reloj,
                Options.Create(new OpcionesMultimedia()));
            return new Entorno(servicio, gestor, almacenamiento, auditoria, reloj);
        }

        private static CargarFotoPerfilDto Archivo(byte[] contenido, string nombre = "perfil.png", string mime = "image/png") =>
            new(new MemoryStream(contenido), nombre, mime, contenido.Length);

        [Fact]
        public async Task Cambiar_guarda_la_imagen_la_asigna_al_usuario_actual_y_lo_audita()
        {
            var e = Crear();

            var resultado = await e.Servicio.CambiarAsync(Archivo(Png));

            var foto = e.Gestor.Fotos[1];
            Assert.Equal("image/png", foto.TipoMime);
            Assert.Equal(Png, e.Almacenamiento.Archivos[foto.ClaveAlmacenamiento]);
            Assert.Equal(Mapeos.VersionFoto(foto.ActualizadaUtc), resultado.FotoVersion);
            Assert.Equal(AccionAuditoria.CambiarFoto, Assert.Single(e.Auditoria.Registros).Accion);
        }

        [Fact]
        public async Task Una_foto_nueva_reemplaza_a_la_anterior_y_borra_su_archivo()
        {
            var e = Crear();
            var primera = await e.Servicio.CambiarAsync(Archivo(Png));
            var clavePrimera = e.Gestor.Fotos[1].ClaveAlmacenamiento;

            e.Reloj.Ahora = e.Reloj.Ahora.AddMinutes(5);
            var segunda = await e.Servicio.CambiarAsync(Archivo(Png));

            Assert.NotEqual(primera.FotoVersion, segunda.FotoVersion);
            Assert.False(e.Almacenamiento.Archivos.ContainsKey(clavePrimera));
            Assert.Single(e.Almacenamiento.Archivos);
        }

        [Fact]
        public async Task Rechaza_un_video_y_no_guarda_nada()
        {
            var e = Crear();

            await Assert.ThrowsAsync<ExcepcionValidacion>(() => e.Servicio.CambiarAsync(Archivo(Mp4, "clip.mp4", "video/mp4")));

            Assert.Empty(e.Almacenamiento.Archivos);
            Assert.Empty(e.Gestor.Fotos);
            Assert.Empty(e.Auditoria.Registros);
        }

        [Fact]
        public async Task Quitar_borra_el_archivo_y_solo_audita_si_habia_foto()
        {
            var e = Crear();
            await e.Servicio.QuitarAsync();
            Assert.Empty(e.Auditoria.Registros);

            await e.Servicio.CambiarAsync(Archivo(Png));
            await e.Servicio.QuitarAsync();

            Assert.Empty(e.Gestor.Fotos);
            Assert.Empty(e.Almacenamiento.Archivos);
            Assert.Equal(2, e.Auditoria.Registros.Count);
        }

        [Fact]
        public async Task Sin_sesion_no_se_puede_cambiar_la_foto_y_sin_foto_no_hay_contenido()
        {
            var sinSesion = Crear(usuarioActualId: null);
            await Assert.ThrowsAsync<ExcepcionNoAutorizado>(() => sinSesion.Servicio.CambiarAsync(Archivo(Png)));

            var e = Crear();
            await Assert.ThrowsAsync<ExcepcionNoEncontrado>(() => e.Servicio.ObtenerAsync(1));
        }
    }
}
