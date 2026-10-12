using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Domain.Exceptions;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Asigna una lista a exactamente un destino: sucursal, grupo o pantalla.
    /// </summary>
    public class AsignacionLista : EntidadBase
    {
        public int ListaReproduccionId { get; set; }
        public int? SucursalId { get; set; }
        public int? GrupoPantallaId { get; set; }
        public int? PantallaId { get; set; }
        public bool EstaHabilitada { get; set; } = true;
        public DateTime? FechaInicioUtc { get; set; }
        public DateTime? FechaFinUtc { get; set; }
        public DateTime FechaCreacionUtc { get; set; }

        public ListaReproduccion ListaReproduccion { get; set; } = null!;
        public Sucursal? Sucursal { get; set; }
        public GrupoPantalla? GrupoPantalla { get; set; }
        public Pantalla? Pantalla { get; set; }
        public ICollection<ReglaHorario> ReglasHorario { get; set; } = new List<ReglaHorario>();

        public bool TieneDestinoUnico() =>
            (SucursalId.HasValue ? 1 : 0) + (GrupoPantallaId.HasValue ? 1 : 0) + (PantallaId.HasValue ? 1 : 0) == 1;

        public NivelAsignacion Nivel =>
            PantallaId.HasValue ? NivelAsignacion.Pantalla
            : GrupoPantallaId.HasValue ? NivelAsignacion.GrupoPantalla
            : NivelAsignacion.Sucursal;

        public void Validar()
        {
            if (!TieneDestinoUnico())
            {
                throw new ExcepcionDominio("La asignación debe tener exactamente un destino: sucursal, grupo o pantalla.");
            }

            if (FechaInicioUtc.HasValue && FechaFinUtc.HasValue && FechaFinUtc <= FechaInicioUtc)
            {
                throw new ExcepcionDominio("La fecha de fin debe ser posterior a la fecha de inicio.");
            }

            foreach (var regla in ReglasHorario)
            {
                regla.Validar();
            }
        }

        /// <summary>Habilitada y dentro de su rango de fechas (un extremo nulo es abierto). No considera los horarios.</summary>
        public bool EstaVigente(DateTime ahoraUtc) =>
            EstaHabilitada
            && (!FechaInicioUtc.HasValue || FechaInicioUtc <= ahoraUtc)
            && (!FechaFinUtc.HasValue || ahoraUtc < FechaFinUtc);

        /// <summary>
        /// Vigente y dentro de alguna de sus franjas semanales. Sin reglas activas la asignación aplica todo el tiempo
        /// dentro de su vigencia.
        /// </summary>
        public bool EstaActivaEn(DateTime ahoraUtc)
        {
            if (!EstaVigente(ahoraUtc))
            {
                return false;
            }

            var reglas = ReglasActivas().ToList();
            return reglas.Count == 0 || reglas.Any(r => r.EstaActivaEn(ahoraUtc));
        }

        /// <summary>Indica si los rangos de fechas se solapan (un extremo nulo es abierto).</summary>
        public bool VigenciaSeSolapaCon(AsignacionLista otra) =>
            (!FechaInicioUtc.HasValue || !otra.FechaFinUtc.HasValue || FechaInicioUtc < otra.FechaFinUtc)
            && (!otra.FechaInicioUtc.HasValue || !FechaFinUtc.HasValue || otra.FechaInicioUtc < FechaFinUtc);

        /// <summary>
        /// Indica si las franjas semanales de ambas asignaciones coinciden en algún momento. Una asignación sin reglas
        /// activas aplica siempre, así que coincide con cualquier otra.
        /// </summary>
        public bool HorarioSeSolapaCon(AsignacionLista otra, DateTime referenciaUtc)
        {
            var propias = ReglasActivas().ToList();
            var ajenas = otra.ReglasActivas().ToList();
            return propias.Count == 0 || ajenas.Count == 0
                || propias.Any(a => ajenas.Any(b => a.SeSolapaCon(b, referenciaUtc)));
        }

        /// <summary>
        /// Dos asignaciones habilitadas del mismo destino son ambiguas si coinciden a la vez en fechas y en horario.
        /// </summary>
        public bool EsAmbiguaCon(AsignacionLista otra, DateTime referenciaUtc) =>
            VigenciaSeSolapaCon(otra) && HorarioSeSolapaCon(otra, referenciaUtc);

        private IEnumerable<ReglaHorario> ReglasActivas() => ReglasHorario.Where(r => r.EstaActiva);
    }
}
