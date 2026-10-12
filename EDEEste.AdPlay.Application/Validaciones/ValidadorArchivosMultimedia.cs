using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.Validaciones
{
    /// <summary>
    /// Lista blanca de formatos: extensión, MIME declarado y firma real del contenido deben coincidir.
    /// </summary>
    public static class ValidadorArchivosMultimedia
    {
        private sealed record FormatoPermitido(
            string Extension,
            string TipoMime,
            TipoMultimedia TipoMultimedia,
            Func<ReadOnlyMemory<byte>, bool> FirmaValida);

        private static readonly FormatoPermitido[] Formatos =
        [
            new(".jpg", "image/jpeg", TipoMultimedia.Imagen, EsJpeg),
            new(".jpeg", "image/jpeg", TipoMultimedia.Imagen, EsJpeg),
            new(".png", "image/png", TipoMultimedia.Imagen,
                c => c.Span.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })),
            new(".webp", "image/webp", TipoMultimedia.Imagen,
                c => c.Length >= 12 && c.Span[..4].SequenceEqual("RIFF"u8) && c.Span[8..12].SequenceEqual("WEBP"u8)),
            new(".mp4", "video/mp4", TipoMultimedia.Video,
                c => c.Length >= 8 && c.Span[4..8].SequenceEqual("ftyp"u8)),
            new(".webm", "video/webm", TipoMultimedia.Video,
                c => c.Span.StartsWith(new byte[] { 0x1A, 0x45, 0xDF, 0xA3 })),
        ];

        public const int BytesCabecera = 16;

        public static IEnumerable<string> ExtensionesPermitidas => Formatos.Select(f => f.Extension);

        /// <summary>
        /// Valida el archivo y devuelve el tipo multimedia, el MIME normalizado y la extensión a usar en la clave interna.
        /// </summary>
        public static (TipoMultimedia Tipo, string TipoMime, string Extension) Validar(
            string nombreOriginal,
            string tipoMimeDeclarado,
            long longitud,
            ReadOnlyMemory<byte> cabecera,
            OpcionesMultimedia opciones)
        {
            var extension = Path.GetExtension(nombreOriginal).ToLowerInvariant();
            var formato = Formatos.FirstOrDefault(f => f.Extension == extension);
            if (formato is null)
            {
                throw new ExcepcionValidacion(
                    "Archivo",
                    $"Formato no permitido. Formatos aceptados: {string.Join(", ", ExtensionesPermitidas)}.");
            }

            if (!string.Equals(formato.TipoMime, tipoMimeDeclarado, StringComparison.OrdinalIgnoreCase))
            {
                throw new ExcepcionValidacion("Archivo", $"El tipo MIME '{tipoMimeDeclarado}' no corresponde a la extensión '{extension}'.");
            }

            if (!formato.FirmaValida(cabecera))
            {
                throw new ExcepcionValidacion("Archivo", "El contenido del archivo no corresponde a su formato declarado.");
            }

            var maximo = formato.TipoMultimedia == TipoMultimedia.Imagen
                ? opciones.TamanoMaximoImagenBytes
                : opciones.TamanoMaximoVideoBytes;
            if (longitud <= 0 || longitud > maximo)
            {
                throw new ExcepcionValidacion("Archivo", $"El archivo debe pesar entre 1 byte y {maximo / (1024 * 1024)} MB.");
            }

            return (formato.TipoMultimedia, formato.TipoMime, formato.Extension);
        }

        private static bool EsJpeg(ReadOnlyMemory<byte> c) => c.Span.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF });
    }
}
