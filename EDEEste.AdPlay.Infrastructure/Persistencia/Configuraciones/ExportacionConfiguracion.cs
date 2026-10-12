using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class ExportacionConfiguracion : IEntityTypeConfiguration<Exportacion>
    {
        public void Configure(EntityTypeBuilder<Exportacion> builder)
        {
            builder.ToTable("Exportaciones");
            builder.Property(e => e.ClaveAlmacenamiento).HasMaxLength(LongitudesMaximas.ClaveAlmacenamiento);
            builder.Property(e => e.HashPaquete).HasMaxLength(LongitudesMaximas.HashSha256).IsFixedLength();
            builder.Property(e => e.DetalleError).HasMaxLength(LongitudesMaximas.DetalleError);

            builder.HasOne(e => e.PublicacionLista)
                .WithMany(p => p.Exportaciones)
                .HasForeignKey(e => e.PublicacionListaId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
