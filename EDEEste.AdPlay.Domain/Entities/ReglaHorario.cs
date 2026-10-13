using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Domain.Exceptions;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Franja semanal recurrente en la que aplica una asignación: ciertos días, entre dos horas, en una zona horaria.
    /// La hora de fin es exclusiva y debe ser posterior a la de inicio; una franja que cruza la medianoche se expresa
    /// con dos reglas.
    /// </summary>
    public class ReglaHorario : EntidadBase
    {
        private const int MinutosPorDia = 24 * 60;
        private const int DiasPorSemana = 7;
        private const int MinutosPorSemana = DiasPorSemana * MinutosPorDia;

        public int AsignacionListaId { get; set; }
        public DiasSemana DiasSemana { get; set; }
        public TimeOnly HoraInicio { get; set; }
        public TimeOnly HoraFin { get; set; }
        public string ZonaHorariaId { get; set; } = string.Empty;
        public bool EstaActiva { get; set; } = true;

        public AsignacionLista AsignacionLista { get; set; } = null!;

        public void Validar()
        {
            if (DiasSemana == DiasSemana.Ninguno || (DiasSemana & ~DiasSemana.Todos) != 0)
            {
                throw new ExcepcionDominio("Seleccione al menos un día de la semana.");
            }

            if (HoraFin <= HoraInicio)
            {
                throw new ExcepcionDominio("La hora de fin debe ser posterior a la hora de inicio.");
            }

            if (!TimeZoneInfo.TryFindSystemTimeZoneById(ZonaHorariaId, out _))
            {
                throw new ExcepcionDominio($"La zona horaria '{ZonaHorariaId}' no existe.");
            }
        }

        /// <summary>Indica si la regla está activa y el instante cae dentro de su franja, según la hora local de su zona.</summary>
        public bool EstaActivaEn(DateTime ahoraUtc)
        {
            if (!EstaActiva)
            {
                return false;
            }

            var local = TimeZoneInfo.ConvertTimeFromUtc(ahoraUtc, ObtenerZona());
            var hora = TimeOnly.FromDateTime(local);
            return DiasSemana.HasFlag(DiaDe(local.DayOfWeek)) && hora >= HoraInicio && hora < HoraFin;
        }

        /// <summary>
        /// Indica si dos reglas coinciden en algún momento de la semana. Compara ambas proyectadas a UTC con el
        /// desfase que tenga cada zona en <paramref name="referenciaUtc"/>, así soporta reglas de zonas distintas.
        /// </summary>
        public bool SeSolapaCon(ReglaHorario otra, DateTime referenciaUtc)
        {
            var propios = IntervalosSemanalesUtc(referenciaUtc).ToList();
            return otra.IntervalosSemanalesUtc(referenciaUtc)
                .Any(b => propios.Any(a => a.Inicio < b.Fin && b.Inicio < a.Fin));
        }

        /// <summary>Intervalos [inicio, fin) en minutos desde el domingo 00:00 UTC, dentro de [0, minutos por semana].</summary>
        private IEnumerable<(int Inicio, int Fin)> IntervalosSemanalesUtc(DateTime referenciaUtc)
        {
            var desfase = (int)ObtenerZona().GetUtcOffset(referenciaUtc).TotalMinutes;
            var inicioDia = (int)HoraInicio.ToTimeSpan().TotalMinutes;
            var duracion = (int)(HoraFin.ToTimeSpan() - HoraInicio.ToTimeSpan()).TotalMinutes;

            for (var dia = 0; dia < DiasPorSemana; dia++)
            {
                if (!DiasSemana.HasFlag((DiasSemana)(1 << dia)))
                {
                    continue;
                }

                var inicio = (((dia * MinutosPorDia) + inicioDia - desfase) % MinutosPorSemana + MinutosPorSemana) % MinutosPorSemana;
                var fin = inicio + duracion;
                if (fin <= MinutosPorSemana)
                {
                    yield return (inicio, fin);
                }
                else
                {
                    // Cruza el final de la semana: se parte en dos tramos.
                    yield return (inicio, MinutosPorSemana);
                    yield return (0, fin - MinutosPorSemana);
                }
            }
        }

        private TimeZoneInfo ObtenerZona() => TimeZoneInfo.FindSystemTimeZoneById(ZonaHorariaId);

        /// <summary>Los valores de <see cref="DiasSemana"/> son 1 &lt;&lt; (DayOfWeek), con domingo = 0.</summary>
        private static DiasSemana DiaDe(DayOfWeek dia) => (DiasSemana)(1 << (int)dia);
    }
}
