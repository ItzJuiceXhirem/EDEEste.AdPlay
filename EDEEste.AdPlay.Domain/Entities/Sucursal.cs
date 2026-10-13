using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Domain.Entities
{
    public class Sucursal : EntidadBase
    {
        public string Codigo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string ZonaHorariaId { get; set; } = string.Empty;
        public bool EstaActiva { get; set; } = true;
        public DateTime FechaCreacionUtc { get; set; }

        public ICollection<GrupoPantalla> Grupos { get; set; } = new List<GrupoPantalla>();
    }
}
