using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Exceptions;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Lista editable. Publicarla genera una versión inmutable (<see cref="PublicacionLista"/>).
    /// </summary>
    public class ListaReproduccion : EntidadBase
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public bool EstaActiva { get; set; } = true;
        public DateTime FechaCreacionUtc { get; set; }
        public DateTime? FechaActualizacionUtc { get; set; }
        public int? UsuarioCreadorId { get; set; }

        public ICollection<ElementoListaReproduccion> Elementos { get; set; } = new List<ElementoListaReproduccion>();
        public ICollection<AsignacionLista> Asignaciones { get; set; } = new List<AsignacionLista>();
        public ICollection<PublicacionLista> Publicaciones { get; set; } = new List<PublicacionLista>();

        /// <summary>
        /// Reemplaza los elementos en el orden recibido, asignando posiciones consecutivas desde 1.
        /// </summary>
        public void ReemplazarElementos(IEnumerable<(int AnuncioId, int? DuracionPersonalizadaSegundos)> elementos, DateTime ahoraUtc)
        {
            var nuevos = new List<ElementoListaReproduccion>();
            var posicion = 1;
            foreach (var (anuncioId, duracion) in elementos)
            {
                if (duracion.HasValue && !ReglasDuracion.EsValida(duracion.Value))
                {
                    throw new ExcepcionDominio(
                        $"La duración debe estar entre {ReglasDuracion.MinimoSegundos} y {ReglasDuracion.MaximoSegundos} segundos.");
                }

                nuevos.Add(new ElementoListaReproduccion
                {
                    AnuncioId = anuncioId,
                    Posicion = posicion++,
                    DuracionPersonalizadaSegundos = duracion
                });
            }

            Elementos.Clear();
            foreach (var elemento in nuevos)
            {
                Elementos.Add(elemento);
            }

            FechaActualizacionUtc = ahoraUtc;
        }
    }
}
