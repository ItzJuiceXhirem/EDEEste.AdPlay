using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class ElementoPublicacionConfiguracion : IEntityTypeConfiguration<ElementoPublicacion>
    {
        public void Configure(EntityTypeBuilder<ElementoPublicacion> builder)
        {
            builder.ToTable("ElementosPublicacion", t =>
            {
                t.HasCheckConstraint("CK_ElementosPublicacion_Posicion", "[Posicion] > 0");
                t.HasCheckConstraint("CK_ElementosPublicacion_DuracionSegundos", "[DuracionSegundos] > 0");
            });
            builder.Property(e => e.NombreArchivoPublicado).HasMaxLength(LongitudesMaximas.NombreArchivoPublicado).IsRequired();
            builder.Property(e => e.HashSha256).HasMaxLength(LongitudesMaximas.HashSha256).IsFixedLength().IsRequired();
            builder.HasIndex(e => new { e.PublicacionListaId, e.Posicion }).IsUnique();

            // Una publicación es histórica e inmutable: nada de lo que referencia se elimina en cascada.
            builder.HasOne(e => e.PublicacionLista)
                .WithMany(p => p.Elementos)
                .HasForeignKey(e => e.PublicacionListaId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.Anuncio)
                .WithMany()
                .HasForeignKey(e => e.AnuncioId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.ArchivoMultimedia)
                .WithMany()
                .HasForeignKey(e => e.ArchivoMultimediaId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
