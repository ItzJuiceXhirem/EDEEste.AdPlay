using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class ArchivoMultimediaConfiguracion : IEntityTypeConfiguration<ArchivoMultimedia>
    {
        public void Configure(EntityTypeBuilder<ArchivoMultimedia> builder)
        {
            builder.ToTable("ArchivosMultimedia", t =>
            {
                t.HasCheckConstraint("CK_ArchivosMultimedia_TamanoBytes", "[TamanoBytes] > 0");
                t.HasCheckConstraint("CK_ArchivosMultimedia_DuracionSegundos", "[DuracionSegundos] IS NULL OR [DuracionSegundos] > 0");
            });
            builder.Property(a => a.NombreOriginal).HasMaxLength(LongitudesMaximas.NombreArchivo).IsRequired();
            builder.Property(a => a.ClaveAlmacenamiento).HasMaxLength(LongitudesMaximas.ClaveAlmacenamiento).IsRequired();
            builder.Property(a => a.TipoMime).HasMaxLength(LongitudesMaximas.TipoMime).IsRequired();
            builder.Property(a => a.HashSha256).HasMaxLength(LongitudesMaximas.HashSha256).IsFixedLength().IsRequired();

            builder.HasIndex(a => a.ClaveAlmacenamiento).IsUnique();
            builder.HasIndex(a => a.HashSha256);
        }
    }
}
