namespace EDEEste.AdPlay.Application.Opciones
{
    public sealed class OpcionesReproductor
    {
        public const string Seccion = "Reproductor";

        /// <summary>Cada cuánto el reproductor web consulta el manifiesto.</summary>
        public int IntervaloConsultaSegundos { get; set; } = 30;

        /// <summary>Intervalos sin latido tras los cuales una pantalla se considera desconectada.</summary>
        public int IntervalosParaDesconexion { get; set; } = 3;

        public TimeSpan VentanaDesconexion =>
            TimeSpan.FromSeconds(IntervaloConsultaSegundos * IntervalosParaDesconexion);
    }
}
