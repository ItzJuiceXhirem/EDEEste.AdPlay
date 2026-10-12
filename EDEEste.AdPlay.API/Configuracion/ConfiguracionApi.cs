using System.Text.Json.Serialization;
using EDEEste.AdPlay.API.Endpoints;
using EDEEste.AdPlay.Application;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Infrastructure;
using EDEEste.AdPlay.Infrastructure.Almacenamiento;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.AspNetCore.Http.Features;

namespace EDEEste.AdPlay.API.Configuracion
{
    /// <summary>
    /// Raíz de composición: registra los servicios de cada capa y la configuración propia de la API.
    /// </summary>
    public static class ConfiguracionApi
    {
        public const string PoliticaCors = "Presentation";

        private const string NombreCadenaConexion = "AdPlay";
        private const string SeccionCors = "Cors:OrigenesPermitidos";
        private const string ClaveMigracionesAlIniciar = "BaseDatos:AplicarMigracionesAlIniciar";

        public static WebApplicationBuilder AgregarServiciosApi(this WebApplicationBuilder builder)
        {
            var configuracion = builder.Configuration;
            var services = builder.Services;

            ConfigurarOpciones(builder);
            builder.AgregarSeguridadApi();
            services.AgregarAplicacion();
            services.AgregarInfraestructura(ObtenerCadenaConexion(configuracion));

            ConfigurarLimitesDeCarga(builder);
            ConfigurarHttp(services);
            ConfigurarCors(services, configuracion);

            return builder;
        }

        public static async Task AplicarMigracionesSiCorrespondeAsync(this WebApplication app)
        {
            if (app.Configuration.GetValue<bool>(ClaveMigracionesAlIniciar))
            {
                await app.Services.AplicarMigracionesAsync();
            }
        }

        private static string ObtenerCadenaConexion(IConfiguration configuracion)
        {
            var cadena = configuracion.GetConnectionString(NombreCadenaConexion);
            if (string.IsNullOrWhiteSpace(cadena))
            {
                throw new InvalidOperationException(
                    $"Falta la cadena de conexión 'ConnectionStrings:{NombreCadenaConexion}'. En desarrollo configúrela con " +
                    $"'dotnet user-secrets set \"ConnectionStrings:{NombreCadenaConexion}\" \"<cadena>\" --project EDEEste.AdPlay.API'; " +
                    "en otros ambientes, con variables de entorno o el gestor de secretos corporativo.");
            }

            return cadena;
        }

        private static void ConfigurarOpciones(WebApplicationBuilder builder)
        {
            var services = builder.Services;
            var configuracion = builder.Configuration;

            services.Configure<OpcionesMultimedia>(configuracion.GetSection(OpcionesMultimedia.Seccion));
            services.Configure<OpcionesReproductor>(configuracion.GetSection(OpcionesReproductor.Seccion));
            services.Configure<OpcionesAlmacenamiento>(configuracion.GetSection(OpcionesAlmacenamiento.Seccion));

            // Una ruta relativa se resuelve desde la raíz del proyecto, nunca dentro de wwwroot.
            services.PostConfigure<OpcionesAlmacenamiento>(o =>
            {
                if (!string.IsNullOrWhiteSpace(o.RutaRaiz) && !Path.IsPathRooted(o.RutaRaiz))
                {
                    o.RutaRaiz = Path.Combine(builder.Environment.ContentRootPath, o.RutaRaiz);
                }
            });
        }

        /// <summary>
        /// Límite de los campos multipart. El límite del cuerpo de la petición se aplica solo al endpoint de carga
        /// (ver MultimediaEndpoints), no globalmente: los demás endpoints conservan el límite predeterminado de Kestrel.
        /// </summary>
        private static void ConfigurarLimitesDeCarga(WebApplicationBuilder builder)
        {
            var multimedia = builder.Configuration.GetSection(OpcionesMultimedia.Seccion).Get<OpcionesMultimedia>()
                ?? new OpcionesMultimedia();

            builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = multimedia.TamanoMaximoSolicitudBytes);
        }

        private static void ConfigurarHttp(IServiceCollection services)
        {
            services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
            services.AddProblemDetails();
            services.AddExceptionHandler<ManejadorExcepciones>();
            services.AddOpenApi();
        }

        private static void ConfigurarCors(IServiceCollection services, IConfiguration configuracion)
        {
            var origenes = configuracion.GetSection(SeccionCors).Get<string[]>() ?? [];
            services.AddCors(o => o.AddPolicy(PoliticaCors, politica => politica
                .WithOrigins(origenes)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("ETag", "Content-Disposition", PublicacionesEndpoints.CabeceraHashPaquete)));
        }
    }
}
