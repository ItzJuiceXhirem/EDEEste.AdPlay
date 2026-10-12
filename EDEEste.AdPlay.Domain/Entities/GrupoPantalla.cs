using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Ubicación dentro de una sucursal. Puede contener subgrupos del mismo árbol (misma sucursal, sin ciclos).
    /// </summary>
    public class GrupoPantalla : EntidadBase
    {
        public int SucursalId { get; set; }
        public int? GrupoPadreId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public bool EstaActivo { get; set; } = true;

        public Sucursal Sucursal { get; set; } = null!;
        public GrupoPantalla? GrupoPadre { get; set; }
        public ICollection<GrupoPantalla> Subgrupos { get; set; } = new List<GrupoPantalla>();
        public ICollection<Pantalla> Pantallas { get; set; } = new List<Pantalla>();
    }
}
