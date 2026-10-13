using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class RegistroAuditoriaConfiguracion : IEntityTypeConfiguration<RegistroAuditoria>
    {
        public void Configure(EntityTypeBuilder<RegistroAuditoria> builder)
        {
            builder.ToTable("RegistrosAuditoria");
            builder.Property(r => r.TipoEntidad).HasMaxLength(LongitudesMaximas.TipoEntidad).IsRequired();
            builder.Property(r => r.Detalle).HasMaxLength(LongitudesMaximas.DetalleAuditoria);

            // Consultas habituales: lo más reciente, por usuario y por entidad.
            builder.HasIndex(r => r.FechaUtc);
            builder.HasIndex(r => new { r.TipoEntidad, r.EntidadId });
        }
    }
}
