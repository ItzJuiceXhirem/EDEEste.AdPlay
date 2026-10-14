using System.Linq.Expressions;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Infrastructure.Identidad;
using EDEEste.AdPlay.Infrastructure.Persistencia.Convertidores;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Persistencia
{
    public class ContextoPublicidad : IdentityDbContext<UsuarioAplicacion, RolAplicacion, int>
    {
        public ContextoPublicidad(DbContextOptions<ContextoPublicidad> options) : base(options)
        {
        }

        public DbSet<Sucursal> Sucursales => Set<Sucursal>();
        public DbSet<GrupoPantalla> GruposPantallas => Set<GrupoPantalla>();
        public DbSet<Pantalla> Pantallas => Set<Pantalla>();
        public DbSet<EstadoPantalla> EstadosPantallas => Set<EstadoPantalla>();
        public DbSet<ArchivoMultimedia> ArchivosMultimedia => Set<ArchivoMultimedia>();
        public DbSet<Anuncio> Anuncios => Set<Anuncio>();
        public DbSet<ListaReproduccion> ListasReproduccion => Set<ListaReproduccion>();
        public DbSet<ElementoListaReproduccion> ElementosListaReproduccion => Set<ElementoListaReproduccion>();
        public DbSet<AsignacionLista> AsignacionesListas => Set<AsignacionLista>();
        public DbSet<ReglaHorario> ReglasHorario => Set<ReglaHorario>();
        public DbSet<PublicacionLista> PublicacionesListas => Set<PublicacionLista>();
        public DbSet<ElementoPublicacion> ElementosPublicacion => Set<ElementoPublicacion>();
        public DbSet<Exportacion> Exportaciones => Set<Exportacion>();
        public DbSet<RegistroAuditoria> RegistrosAuditoria => Set<RegistroAuditoria>();
        public DbSet<Invitacion> Invitaciones => Set<Invitacion>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(ContextoPublicidad).Assembly);

            NombrarTablasDeIdentidad(modelBuilder);
            RelacionarConUsuarios(modelBuilder);
        }

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            // No hay longitud de texto predeterminada: cada columna propia declara la suya (ver LongitudesMaximas) y
            // una prueba lo verifica. Así las columnas de Identity conservan los tipos que espera su biblioteca.
            configurationBuilder.Properties<DateTime>().HavePrecision(3).HaveConversion<ConvertidorFechaUtc>();
            configurationBuilder.Properties<DateTime?>().HavePrecision(3).HaveConversion<ConvertidorFechaUtc>();

            // Las enumeraciones se guardan como texto para que los datos sean legibles y no dependan del orden del enum.
            // DiasSemana es un conjunto de banderas y se guarda como número a propósito.
            GuardarComoTexto<ModoReproduccion>(configurationBuilder);
            GuardarComoTexto<TipoMultimedia>(configurationBuilder);
            GuardarComoTexto<EstadoPublicacion>(configurationBuilder);
            GuardarComoTexto<EstadoExportacion>(configurationBuilder);
            GuardarComoTexto<AccionAuditoria>(configurationBuilder);
        }

        private static void GuardarComoTexto<TEnum>(ModelConfigurationBuilder builder) where TEnum : struct, Enum =>
            builder.Properties<TEnum>().HaveConversion<string>().HaveMaxLength(LongitudesMaximas.Enumeracion);

        private static void NombrarTablasDeIdentidad(ModelBuilder builder)
        {
            builder.Entity<UsuarioAplicacion>(e =>
            {
                e.ToTable("Usuarios");
                e.Property(u => u.NombreCompleto).HasMaxLength(LongitudesMaximas.NombreCompleto).IsRequired();
                e.Property(u => u.FotoClaveAlmacenamiento).HasMaxLength(LongitudesMaximas.ClaveAlmacenamiento);
                e.Property(u => u.FotoTipoMime).HasMaxLength(LongitudesMaximas.TipoMime);
            });
            builder.Entity<RolAplicacion>().ToTable("Roles");
            builder.Entity<IdentityUserRole<int>>().ToTable("UsuariosRoles");
            builder.Entity<IdentityUserClaim<int>>().ToTable("UsuarioReclamaciones");
            builder.Entity<IdentityUserLogin<int>>().ToTable("UsuarioIniciosSesion");
            builder.Entity<IdentityUserToken<int>>().ToTable("UsuarioTokens");
            builder.Entity<IdentityRoleClaim<int>>().ToTable("RolReclamaciones");
        }

        /// <summary>
        /// El Dominio guarda ids de usuario como simples enteros (no conoce Identity); aquí se convierten en claves
        /// foráneas para que la base garantice que apuntan a usuarios reales.
        /// </summary>
        private static void RelacionarConUsuarios(ModelBuilder builder)
        {
            Relacionar<ArchivoMultimedia>(builder, e => e.UsuarioCargaId);
            Relacionar<Anuncio>(builder, e => e.UsuarioCreadorId);
            Relacionar<ListaReproduccion>(builder, e => e.UsuarioCreadorId);
            Relacionar<PublicacionLista>(builder, e => e.UsuarioPublicadorId);
            Relacionar<Exportacion>(builder, e => e.UsuarioSolicitanteId);
            Relacionar<RegistroAuditoria>(builder, e => e.UsuarioId);
            Relacionar<Invitacion>(builder, e => e.UsuarioCreadorId);
            Relacionar<Invitacion>(builder, e => e.UsuarioActivadoId);
        }

        private static void Relacionar<TEntidad>(ModelBuilder builder, Expression<Func<TEntidad, object?>> usuarioId)
            where TEntidad : class =>
            builder.Entity<TEntidad>()
                .HasOne<UsuarioAplicacion>()
                .WithMany()
                .HasForeignKey(usuarioId)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
