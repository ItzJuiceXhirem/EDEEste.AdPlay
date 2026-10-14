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

        /// <summary>Posición, dentro de la versión reportada, del anuncio que se mostraba al enviar el último latido.</summary>
        public int? PosicionReproduccion { get; set; }

        public int? AnuncioReproduccionId { get; set; }

        /// <summary>Segundos que llevaba ese anuncio en pantalla al enviar el último latido.</summary>
        public int? SegundoReproduccion { get; set; }

        public Pantalla Pantalla { get; set; } = null!;
    }
}
