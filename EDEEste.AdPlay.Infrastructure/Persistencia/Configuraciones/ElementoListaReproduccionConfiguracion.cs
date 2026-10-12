using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class ElementoListaReproduccionConfiguracion : IEntityTypeConfiguration<ElementoListaReproduccion>
    {
        public void Configure(EntityTypeBuilder<ElementoListaReproduccion> builder)
        {
            builder.ToTable("ElementosListaReproduccion", t =>
            {
                t.HasCheckConstraint("CK_ElementosListaReproduccion_Posicion", "[Posicion] > 0");
                t.HasCheckConstraint(
                    "CK_ElementosListaReproduccion_DuracionPersonalizadaSegundos",
                    "[DuracionPersonalizadaSegundos] IS NULL OR [DuracionPersonalizadaSegundos] > 0");
            });
            builder.Ignore(e => e.DuracionEfectivaSegundos);
            builder.HasIndex(e => new { e.ListaReproduccionId, e.Posicion }).IsUnique();

            // Los elementos son parte de la lista editable; se eliminan con ella.
            builder.HasOne(e => e.ListaReproduccion)
                .WithMany(l => l.Elementos)
                .HasForeignKey(e => e.ListaReproduccionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(e => e.Anuncio)
                .WithMany()
                .HasForeignKey(e => e.AnuncioId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
