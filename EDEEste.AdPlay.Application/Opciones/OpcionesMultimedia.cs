namespace EDEEste.AdPlay.Application.Opciones
{
    public sealed class OpcionesMultimedia
    {
        public const string Seccion = "Multimedia";

        /// <summary>Margen sobre el archivo para los demás campos del formulario multipart.</summary>
        private const long MargenFormularioBytes = 1024 * 1024;

        public int TamanoMaximoImagenMb { get; set; } = 20;
        public int TamanoMaximoVideoMb { get; set; } = 500;

        public long TamanoMaximoImagenBytes => TamanoMaximoImagenMb * 1024L * 1024L;
        public long TamanoMaximoVideoBytes => TamanoMaximoVideoMb * 1024L * 1024L;

        /// <summary>Tamaño máximo de una petición de carga: el mayor archivo permitido más el margen del formulario.</summary>
        public long TamanoMaximoSolicitudBytes =>
            Math.Max(TamanoMaximoImagenBytes, TamanoMaximoVideoBytes) + MargenFormularioBytes;
    }
}
