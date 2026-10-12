using EDEEste.AdPlay.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Configuraciones
{
    public class AsignacionListaConfiguracion : IEntityTypeConfiguration<AsignacionLista>
    {
        public void Configure(EntityTypeBuilder<AsignacionLista> builder)
        {
            builder.ToTable("AsignacionesListas", t =>
            {
                // Exactamente un destino por asignación (sucursal, grupo o pantalla).
                t.HasCheckConstraint(
                    "CK_AsignacionesListas_DestinoUnico",
                    "(CASE WHEN [SucursalId] IS NULL THEN 0 ELSE 1 END" +
                    " + CASE WHEN [GrupoPantallaId] IS NULL THEN 0 ELSE 1 END" +
                    " + CASE WHEN [PantallaId] IS NULL THEN 0 ELSE 1 END) = 1");
                t.HasCheckConstraint(
                    "CK_AsignacionesListas_Vigencia",
                    "[FechaInicioUtc] IS NULL OR [FechaFinUtc] IS NULL OR [FechaFinUtc] > [FechaInicioUtc]");
            });
            builder.Ignore(a => a.Nivel);

            builder.HasOne(a => a.ListaReproduccion)
                .WithMany(l => l.Asignaciones)
                .HasForeignKey(a => a.ListaReproduccionId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(a => a.Sucursal)
                .WithMany()
                .HasForeignKey(a => a.SucursalId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(a => a.GrupoPantalla)
                .WithMany()
                .HasForeignKey(a => a.GrupoPantallaId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(a => a.Pantalla)
                .WithMany()
                .HasForeignKey(a => a.PantallaId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(a => new { a.FechaInicioUtc, a.FechaFinUtc });
        }
    }
}
