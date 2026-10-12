using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class ListaReproduccionConfiguracion : IEntityTypeConfiguration<ListaReproduccion>
    {
        public void Configure(EntityTypeBuilder<ListaReproduccion> builder)
        {
            builder.ToTable("ListasReproduccion");
            builder.Property(l => l.Nombre).HasMaxLength(LongitudesMaximas.Nombre).IsRequired();
            builder.Property(l => l.Descripcion).HasMaxLength(LongitudesMaximas.Descripcion);
        }
    }
}
