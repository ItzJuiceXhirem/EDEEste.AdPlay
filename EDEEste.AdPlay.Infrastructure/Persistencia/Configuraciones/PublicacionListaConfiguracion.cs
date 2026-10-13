using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class PublicacionListaConfiguracion : IEntityTypeConfiguration<PublicacionLista>
    {
        public void Configure(EntityTypeBuilder<PublicacionLista> builder)
        {
            builder.ToTable("PublicacionesListas", t =>
                t.HasCheckConstraint("CK_PublicacionesListas_NumeroVersion", "[NumeroVersion] > 0"));
            builder.Ignore(p => p.IdentificadorVersion);
            builder.HasIndex(p => new { p.ListaReproduccionId, p.NumeroVersion }).IsUnique();

            builder.HasOne(p => p.ListaReproduccion)
                .WithMany(l => l.Publicaciones)
                .HasForeignKey(p => p.ListaReproduccionId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
