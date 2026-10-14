using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Infrastructure.Identidad;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Tests.Infrastructure
{
    /// <summary>
    /// Pruebas del modelo de EF Core. Construyen el modelo sin conectarse a ninguna base de datos.
    /// </summary>
    public class EsquemaBaseDatosTests
    {
        private static readonly DbContextOptions<ContextoPublicidad> Opciones =
            new DbContextOptionsBuilder<ContextoPublicidad>()
                .UseSqlServer("Server=.;Database=NoSeUsa;Trusted_Connection=True;TrustServerCertificate=True")
                .Options;

        private static ContextoPublicidad CrearContexto() => new(Opciones);

        [Fact]
        public void Toda_columna_de_texto_propia_declara_su_longitud()
        {
            using var contexto = CrearContexto();

            // Las tablas de Identity (excepto los campos propios del usuario) usan los tipos de su biblioteca.
            string[] propiasDeUsuario =
            [
                nameof(UsuarioAplicacion.NombreCompleto),
                nameof(UsuarioAplicacion.FotoClaveAlmacenamiento),
                nameof(UsuarioAplicacion.FotoTipoMime),
            ];
            var propias = contexto.Model.GetEntityTypes()
                .Where(t => t.ClrType.Namespace?.StartsWith("EDEEste.AdPlay.Domain", StringComparison.Ordinal) == true
                    || t.ClrType == typeof(UsuarioAplicacion))
                .SelectMany(t => t.GetProperties().Select(p => (Tipo: t.ClrType, Propiedad: p)))
                .Where(x => x.Propiedad.ClrType == typeof(string))
                .Where(x => x.Tipo != typeof(UsuarioAplicacion) || propiasDeUsuario.Contains(x.Propiedad.Name));

            var sinLongitud = propias
                .Where(x => x.Propiedad.GetMaxLength() is null)
                .Select(x => $"{x.Tipo.Name}.{x.Propiedad.Name}")
                .ToList();

            Assert.True(sinLongitud.Count == 0, "Columnas de texto sin longitud: " + string.Join(", ", sinLongitud));
        }

        [Fact]
        public void Las_columnas_con_usuario_son_claves_foraneas_a_la_tabla_de_usuarios()
        {
            using var contexto = CrearContexto();
            var tablaUsuarios = contexto.Model.FindEntityType(typeof(UsuarioAplicacion))!;

            var esperados = new (Type Entidad, string Propiedad)[]
            {
                (typeof(ArchivoMultimedia), nameof(ArchivoMultimedia.UsuarioCargaId)),
                (typeof(Anuncio), nameof(Anuncio.UsuarioCreadorId)),
                (typeof(ListaReproduccion), nameof(ListaReproduccion.UsuarioCreadorId)),
                (typeof(PublicacionLista), nameof(PublicacionLista.UsuarioPublicadorId)),
                (typeof(Exportacion), nameof(Exportacion.UsuarioSolicitanteId)),
                (typeof(RegistroAuditoria), nameof(RegistroAuditoria.UsuarioId)),
            };

            foreach (var (entidad, propiedad) in esperados)
            {
                var tipo = contexto.Model.FindEntityType(entidad)!;
                var fk = tipo.GetForeignKeys().SingleOrDefault(f => f.Properties.Any(p => p.Name == propiedad));
                Assert.True(fk is not null, $"{entidad.Name}.{propiedad} no tiene clave foránea.");
                Assert.Equal(tablaUsuarios, fk!.PrincipalEntityType);
                Assert.Equal(DeleteBehavior.Restrict, fk.DeleteBehavior);
            }
        }

        [Fact]
        public void Las_tablas_de_identidad_tienen_nombres_en_espanol()
        {
            using var contexto = CrearContexto();

            var tablas = contexto.Model.GetEntityTypes().Select(t => t.GetTableName()).ToHashSet();

            Assert.Contains("Usuarios", tablas);
            Assert.Contains("Roles", tablas);
            Assert.Contains("UsuariosRoles", tablas);
            Assert.DoesNotContain("AspNetUsers", tablas);
        }

        [Fact]
        public void Ninguna_relacion_elimina_en_cascada_salvo_las_de_composicion()
        {
            using var contexto = CrearContexto();

            var cascadas = contexto.Model.GetEntityTypes()
                .SelectMany(t => t.GetForeignKeys())
                .Where(f => f.DeleteBehavior == DeleteBehavior.Cascade)
                .Where(f => f.DeclaringEntityType.ClrType.Namespace?.StartsWith("EDEEste.AdPlay.Domain", StringComparison.Ordinal) == true)
                .Select(f => f.DeclaringEntityType.ClrType.Name)
                .OrderBy(n => n)
                .ToList();

            // Parte de un todo: los elementos de una lista, el estado de una pantalla y los horarios de una asignación.
            Assert.Equal(["ElementoListaReproduccion", "EstadoPantalla", "ReglaHorario"], cascadas);
        }
    }
}
