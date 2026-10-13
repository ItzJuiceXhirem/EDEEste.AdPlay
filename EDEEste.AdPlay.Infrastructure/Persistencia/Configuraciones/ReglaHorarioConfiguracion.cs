using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class ReglaHorarioConfiguracion : IEntityTypeConfiguration<ReglaHorario>
    {
        public void Configure(EntityTypeBuilder<ReglaHorario> builder)
        {
            // DiasSemana es un conjunto de banderas: al menos un día y ningún bit fuera de los siete días.
            builder.ToTable("ReglasHorario", t =>
                t.HasCheckConstraint("CK_ReglasHorario_Dias", $"[DiasSemana] > 0 AND [DiasSemana] <= {(int)DiasSemana.Todos}"));
            builder.Property(r => r.ZonaHorariaId).HasMaxLength(LongitudesMaximas.ZonaHoraria).IsRequired();

            builder.HasOne(r => r.AsignacionLista)
                .WithMany(a => a.ReglasHorario)
                .HasForeignKey(r => r.AsignacionListaId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
