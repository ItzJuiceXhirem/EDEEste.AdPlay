using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class AnuncioConfiguracion : IEntityTypeConfiguration<Anuncio>
    {
        public void Configure(EntityTypeBuilder<Anuncio> builder)
        {
            builder.ToTable("Anuncios", t =>
                t.HasCheckConstraint("CK_Anuncios_DuracionPredeterminadaSegundos", "[DuracionPredeterminadaSegundos] > 0"));
            builder.Property(a => a.Titulo).HasMaxLength(LongitudesMaximas.Titulo).IsRequired();
            builder.Property(a => a.Descripcion).HasMaxLength(LongitudesMaximas.Descripcion);

            builder.HasOne(a => a.ArchivoMultimedia)
                .WithMany(m => m.Anuncios)
                .HasForeignKey(a => a.ArchivoMultimediaId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
