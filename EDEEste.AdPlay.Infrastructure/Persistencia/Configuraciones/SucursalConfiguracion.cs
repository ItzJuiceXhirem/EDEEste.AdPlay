using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class SucursalConfiguracion : IEntityTypeConfiguration<Sucursal>
    {
        // Las semillas deben ser valores fijos: un valor dinámico generaría una migración distinta en cada compilación.
        private static readonly DateTime FechaSemilla = new(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc);

        public void Configure(EntityTypeBuilder<Sucursal> builder)
        {
            builder.ToTable("Sucursales");
            builder.Property(s => s.Codigo).HasMaxLength(LongitudesMaximas.Codigo).IsRequired();
            builder.Property(s => s.Nombre).HasMaxLength(LongitudesMaximas.Nombre).IsRequired();
            builder.Property(s => s.ZonaHorariaId).HasMaxLength(LongitudesMaximas.ZonaHoraria).IsRequired();
            builder.HasIndex(s => s.Codigo).IsUnique();

            builder.HasData(
                CrearSemilla(id: 1, codigo: "MEGACENTRO", nombre: "Megacentro"),
                CrearSemilla(id: 2, codigo: "SABANA-LARGA", nombre: "Sabana Larga"));
        }

        private static Sucursal CrearSemilla(int id, string codigo, string nombre) => new()
        {
            Id = id,
            Codigo = codigo,
            Nombre = nombre,
            ZonaHorariaId = ZonasHorarias.Predeterminada,
            EstaActiva = true,
            FechaCreacionUtc = FechaSemilla
        };
    }
}
