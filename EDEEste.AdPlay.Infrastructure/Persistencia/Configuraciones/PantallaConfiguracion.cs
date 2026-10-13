using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class PantallaConfiguracion : IEntityTypeConfiguration<Pantalla>
    {
        public void Configure(EntityTypeBuilder<Pantalla> builder)
        {
            builder.ToTable("Pantallas");
            builder.Property(p => p.CodigoPantalla).HasMaxLength(LongitudesMaximas.CodigoPantalla).IsRequired();
            builder.Property(p => p.Nombre).HasMaxLength(LongitudesMaximas.Nombre).IsRequired();
            builder.Property(p => p.Modelo).HasMaxLength(LongitudesMaximas.Modelo);
            builder.Property(p => p.NumeroSerie).HasMaxLength(LongitudesMaximas.NumeroSerie);
            builder.Property(p => p.TokenDispositivoHash).HasMaxLength(LongitudesMaximas.HashSha256).IsFixedLength();

            builder.HasIndex(p => p.CodigoPantalla).IsUnique();
            builder.HasIndex(p => p.TokenDispositivoHash).IsUnique().HasFilter("[TokenDispositivoHash] IS NOT NULL");

            builder.HasOne(p => p.GrupoPantalla)
                .WithMany(g => g.Pantallas)
                .HasForeignKey(p => p.GrupoPantallaId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
