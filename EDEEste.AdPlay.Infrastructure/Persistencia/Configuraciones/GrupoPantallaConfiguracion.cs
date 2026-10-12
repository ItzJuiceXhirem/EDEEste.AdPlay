using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class GrupoPantallaConfiguracion : IEntityTypeConfiguration<GrupoPantalla>
    {
        public void Configure(EntityTypeBuilder<GrupoPantalla> builder)
        {
            builder.ToTable("GruposPantallas");
            builder.Property(g => g.Nombre).HasMaxLength(LongitudesMaximas.Nombre).IsRequired();

            builder.HasOne(g => g.Sucursal)
                .WithMany(s => s.Grupos)
                .HasForeignKey(g => g.SucursalId)
                .OnDelete(DeleteBehavior.Restrict);

            // Que el padre sea de la misma sucursal y que no haya ciclos se valida en Application (JerarquiaGrupos).
            builder.HasOne(g => g.GrupoPadre)
                .WithMany(g => g.Subgrupos)
                .HasForeignKey(g => g.GrupoPadreId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
