using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Tests.Application
{
    public class ValidadorArchivosMultimediaTests
    {
        private static readonly OpcionesMultimedia Opciones = new() { TamanoMaximoImagenMb = 1, TamanoMaximoVideoMb = 5 };

        private static readonly byte[] CabeceraPng = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];
        private static readonly byte[] CabeceraJpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0];
        private static readonly byte[] CabeceraMp4 = [0, 0, 0, 0x18, (byte)'f', (byte)'t', (byte)'y', (byte)'p', 0, 0, 0, 0];

        [Fact]
        public void Acepta_una_imagen_con_extension_mime_y_firma_coherentes()
        {
            var (tipo, mime, extension) = ValidadorArchivosMultimedia.Validar("Logo.PNG", "image/png", 1000, CabeceraPng, Opciones);

            Assert.Equal(TipoMultimedia.Imagen, tipo);
            Assert.Equal("image/png", mime);
            Assert.Equal(".png", extension);
        }

        [Fact]
        public void Acepta_un_video_mp4()
        {
            var (tipo, _, _) = ValidadorArchivosMultimedia.Validar("clip.mp4", "video/mp4", 2_000_000, CabeceraMp4, Opciones);

            Assert.Equal(TipoMultimedia.Video, tipo);
        }

        [Theory]
        [InlineData("script.exe", "application/octet-stream")]
        [InlineData("imagen.gif", "image/gif")]
        public void Rechaza_extensiones_fuera_de_la_lista_blanca(string nombre, string mime)
        {
            Assert.Throws<ExcepcionValidacion>(() =>
                ValidadorArchivosMultimedia.Validar(nombre, mime, 1000, CabeceraPng, Opciones));
        }

        [Fact]
        public void Rechaza_un_mime_que_no_corresponde_a_la_extension()
        {
            Assert.Throws<ExcepcionValidacion>(() =>
                ValidadorArchivosMultimedia.Validar("foto.png", "image/jpeg", 1000, CabeceraPng, Opciones));
        }

        [Fact]
        public void Rechaza_un_contenido_cuya_firma_no_corresponde_al_formato()
        {
            // Un JPEG renombrado como PNG.
            Assert.Throws<ExcepcionValidacion>(() =>
                ValidadorArchivosMultimedia.Validar("foto.png", "image/png", 1000, CabeceraJpeg, Opciones));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(1024 * 1024 + 1)]
        public void Rechaza_tamanos_vacios_o_superiores_al_maximo_de_imagen(long longitud)
        {
            Assert.Throws<ExcepcionValidacion>(() =>
                ValidadorArchivosMultimedia.Validar("foto.png", "image/png", longitud, CabeceraPng, Opciones));
        }

        [Fact]
        public void Validar_imagen_acepta_imagenes_con_el_limite_indicado()
        {
            var (mime, extension) = ValidadorArchivosMultimedia.ValidarImagen("perfil.jpg", "image/jpeg", 500, CabeceraJpeg, maximoBytes: 1000);

            Assert.Equal("image/jpeg", mime);
            Assert.Equal(".jpg", extension);
            Assert.Throws<ExcepcionValidacion>(() =>
                ValidadorArchivosMultimedia.ValidarImagen("perfil.jpg", "image/jpeg", 1001, CabeceraJpeg, maximoBytes: 1000));
        }

        [Fact]
        public void Validar_imagen_rechaza_videos_aunque_sean_validos_como_multimedia()
        {
            var error = Assert.Throws<ExcepcionValidacion>(() =>
                ValidadorArchivosMultimedia.ValidarImagen("clip.mp4", "video/mp4", 500, CabeceraMp4, maximoBytes: 1000));

            Assert.DoesNotContain(".mp4", error.Errores["Archivo"][0]);
        }
    }
}
