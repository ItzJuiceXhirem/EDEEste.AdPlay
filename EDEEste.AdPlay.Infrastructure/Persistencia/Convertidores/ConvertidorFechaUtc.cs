using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Convertidores
{
    /// <summary>
    /// Todas las fechas se guardan en UTC. Al leerlas se marcan como Utc para que se serialicen con "Z".
    /// </summary>
    public sealed class ConvertidorFechaUtc : ValueConverter<DateTime, DateTime>
    {
        public ConvertidorFechaUtc()
            : base(
                v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
        {
        }
    }
}
