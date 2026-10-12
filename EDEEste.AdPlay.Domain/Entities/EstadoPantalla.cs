namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Estado técnico actual (1:1 con Pantalla) según el último latido recibido.
    /// </summary>
    public class EstadoPantalla
    {
        public int PantallaId { get; set; }
        public DateTime UltimaConexionUtc { get; set; }
        public string? UltimaVersionReportada { get; set; }
        public string? UltimoError { get; set; }

        public Pantalla Pantalla { get; set; } = null!;
    }
}
