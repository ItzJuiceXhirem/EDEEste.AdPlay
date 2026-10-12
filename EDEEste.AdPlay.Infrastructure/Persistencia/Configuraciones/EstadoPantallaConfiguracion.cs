using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class EstadoPantallaConfiguracion : IEntityTypeConfiguration<EstadoPantalla>
    {
        public void Configure(EntityTypeBuilder<EstadoPantalla> builder)
        {
            builder.ToTable("EstadosPantallas");
            builder.HasKey(e => e.PantallaId);
            builder.Property(e => e.UltimaVersionReportada).HasMaxLength(LongitudesMaximas.VersionReportada);
            builder.Property(e => e.UltimoError).HasMaxLength(LongitudesMaximas.DetalleError);

            // El estado técnico no tiene sentido sin su pantalla.
            builder.HasOne(e => e.Pantalla)
                .WithOne(p => p.Estado)
                .HasForeignKey<EstadoPantalla>(e => e.PantallaId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
