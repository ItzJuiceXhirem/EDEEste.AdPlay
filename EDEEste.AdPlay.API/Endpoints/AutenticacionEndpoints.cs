using System.Security.Claims;
using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using EDEEste.AdPlay.Application.DTOs;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.API.Endpoints
{
    public static class AutenticacionEndpoints
    {
        public const string PoliticaLimiteInicioSesion = "inicio-sesion";

        public sealed record RenovarSesionSolicitud(string RenovarToken);

        public static IEndpointRouteBuilder MapearAutenticacion(this IEndpointRouteBuilder rutas)
        {
            var auth = rutas.MapGroup("/auth").WithTags("Autenticación");

            // Devuelve { accessToken, refreshToken, expiresIn }. El token viaja en la cabecera Authorization: Bearer.
            auth.MapPost("/iniciar-sesion", async (CredencialesDto dto, ServicioAutenticacion servicio, CancellationToken ct) =>
            {
                var sesion = await servicio.IniciarSesionAsync(dto, ct);
                return Results.SignIn(CrearPrincipal(sesion), authenticationScheme: BearerTokenDefaults.AuthenticationScheme);
            })
            .AllowAnonymous()
            .RequireRateLimiting(PoliticaLimiteInicioSesion);

            auth.MapPost("/renovar", async (
                RenovarSesionSolicitud solicitud,
                IOptionsMonitor<BearerTokenOptions> opciones,
                TimeProvider reloj,
                ServicioAutenticacion servicio,
                CancellationToken ct) =>
            {
                var protector = opciones.Get(BearerTokenDefaults.AuthenticationScheme).RefreshTokenProtector;
                var ticket = protector.Unprotect(solicitud.RenovarToken);
                if (ticket?.Properties.ExpiresUtc is not { } expira || reloj.GetUtcNow() >= expira
                    || !int.TryParse(ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier), out var usuarioId))
                {
                    return Results.Unauthorized();
                }

                // Vuelve a leer al usuario: refleja cambios de rol y desactivaciones desde el último acceso.
                var sesion = await servicio.ObtenerSesionAsync(usuarioId, ct);
                return sesion is null
                    ? Results.Unauthorized()
                    : Results.SignIn(CrearPrincipal(sesion), authenticationScheme: BearerTokenDefaults.AuthenticationScheme);
            })
            .AllowAnonymous()
            .RequireRateLimiting(PoliticaLimiteInicioSesion);

            auth.MapGet("/sesion", async (HttpContext http, ServicioAutenticacion servicio, CancellationToken ct) =>
            {
                var sesion = int.TryParse(http.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
                    ? await servicio.ObtenerSesionAsync(id, ct)
                    : null;
                return sesion is null ? Results.Unauthorized() : Results.Ok(sesion);
            })
            .RequireAuthorization(PoliticasAcceso.Lectura);

            return rutas;
        }

        private static ClaimsPrincipal CrearPrincipal(SesionDto sesion)
        {
            var identidad = new ClaimsIdentity(BearerTokenDefaults.AuthenticationScheme);
            identidad.AddClaim(new Claim(ClaimTypes.NameIdentifier, sesion.Id.ToString()));
            identidad.AddClaim(new Claim(ClaimTypes.Name, sesion.NombreCompleto));
            identidad.AddClaim(new Claim(ClaimTypes.Email, sesion.Correo));
            identidad.AddClaim(new Claim(ClaimTypes.Role, sesion.Rol));
            return new ClaimsPrincipal(identidad);
        }
    }
}
