namespace EDEEste.AdPlay.Infrastructure.Almacenamiento
{
    public sealed class OpcionesAlmacenamiento
    {
        public const string Seccion = "Almacenamiento";

        /// <summary>
        /// Directorio controlado (fuera de wwwroot) o recurso compartido autorizado donde se guardan medios y paquetes.
        /// </summary>
        public string RutaRaiz { get; set; } = string.Empty;
    }
}
