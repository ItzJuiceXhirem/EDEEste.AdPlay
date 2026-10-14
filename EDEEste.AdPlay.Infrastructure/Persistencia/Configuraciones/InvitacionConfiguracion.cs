using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class InvitacionConfiguracion : IEntityTypeConfiguration<Invitacion>
    {
        public void Configure(EntityTypeBuilder<Invitacion> builder)
        {
            builder.ToTable("Invitaciones");
            builder.Property(i => i.Correo).HasMaxLength(LongitudesMaximas.Correo).IsRequired();
            builder.Property(i => i.NombreCompleto).HasMaxLength(LongitudesMaximas.NombreCompleto).IsRequired();
            builder.Property(i => i.Rol).HasMaxLength(LongitudesMaximas.Enumeracion).IsRequired();
            builder.Property(i => i.TokenHash).HasMaxLength(LongitudesMaximas.HashSha256).IsFixedLength().IsRequired();

            builder.HasIndex(i => i.TokenHash).IsUnique();
            builder.HasIndex(i => i.Correo);
        }
    }
}
