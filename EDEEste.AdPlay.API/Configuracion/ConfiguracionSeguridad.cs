using System.Net;
using System.Threading.RateLimiting;
using EDEEste.AdPlay.API.Endpoints;
using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Infrastructure.Identidad;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.RateLimiting;

namespace EDEEste.AdPlay.API.Configuracion
{
    /// <summary>
    /// Autenticación por token de sesión (Identity valida las credenciales; la sesión viaja como Bearer),
    /// políticas de autorización y límite de intentos de inicio de sesión.
    /// </summary>
    public static class ConfiguracionSeguridad
    {
        public static WebApplicationBuilder AgregarSeguridadApi(this WebApplicationBuilder builder)
        {
            var services = builder.Services;
            var opciones = builder.Configuration.GetSection(OpcionesSeguridad.Seccion).Get<OpcionesSeguridad>()
                ?? new OpcionesSeguridad();

            services.Configure<OpcionesSeguridad>(builder.Configuration.GetSection(OpcionesSeguridad.Seccion));
            services.Configure<OpcionesAdministradorInicial>(builder.Configuration.GetSection(OpcionesAdministradorInicial.Seccion));

            services.AddHttpContextAccessor();
            services.AddScoped<IUsuarioActual, UsuarioActualHttp>();

            services.AddAuthentication(BearerTokenDefaults.AuthenticationScheme)
                .AddBearerToken(BearerTokenDefaults.AuthenticationScheme, bearer =>
                {
                    bearer.BearerTokenExpiration = TimeSpan.FromMinutes(opciones.DuracionAccesoMinutos);
                    bearer.RefreshTokenExpiration = TimeSpan.FromHours(opciones.DuracionRenovacionHoras);
                });
            services.AddAuthorization(PoliticasAcceso.Configurar);

            services.AddRateLimiter(limitador =>
            {
                limitador.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                limitador.AddPolicy(AutenticacionEndpoints.PoliticaLimiteInicioSesion, contexto =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        contexto.Connection.RemoteIpAddress?.ToString() ?? IPAddress.None.ToString(),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = opciones.IntentosInicioSesionPorMinuto,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0
                        }));
            });

            return builder;
        }

        /// <summary>
        /// Crea los roles y, si no hay usuarios, el administrador inicial configurado. Ver
        /// <see cref="InicializadorSeguridad"/>; requiere que las migraciones ya estén aplicadas.
        /// </summary>
        public static async Task InicializarSeguridadSiCorrespondeAsync(this WebApplication app)
        {
            var opciones = app.Configuration.GetSection(OpcionesSeguridad.Seccion).Get<OpcionesSeguridad>();
            if (opciones?.InicializarAlIniciar != true)
            {
                return;
            }

            var administrador = app.Configuration.GetSection(OpcionesAdministradorInicial.Seccion).Get<OpcionesAdministradorInicial>()
                ?? new OpcionesAdministradorInicial();
            await InicializadorSeguridad.InicializarAsync(app.Services, administrador);
        }
    }
}
