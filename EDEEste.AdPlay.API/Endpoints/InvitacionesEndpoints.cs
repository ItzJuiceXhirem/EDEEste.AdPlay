using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using EDEEste.AdPlay.Application.DTOs;
using Microsoft.AspNetCore.Authentication.BearerToken;

namespace EDEEste.AdPlay.API.Endpoints
{
    /// <summary>
    /// Invitaciones: el administrador las crea y anula; la persona invitada consulta la suya y activa su cuenta sin
    /// sesión. El token viaja en el cuerpo (no en la URL) para que no quede en los registros del servidor.
    /// </summary>
    public static class InvitacionesEndpoints
    {
        public static IEndpointRouteBuilder MapearInvitaciones(this IEndpointRouteBuilder rutas)
        {
            var invitaciones = rutas.MapGroup("/invitaciones").WithTags("Usuarios")
                .RequireAuthorization(PoliticasAcceso.Administracion);

            invitaciones.MapGet("/", (ServicioInvitaciones servicio, CancellationToken ct) => servicio.ListarAsync(ct));

            invitaciones.MapPost("/", async (CrearInvitacionDto dto, ServicioInvitaciones servicio, CancellationToken ct) =>
            {
                var creada = await servicio.CrearAsync(dto, ct);
                return TypedResults.Created($"/api/invitaciones/{creada.Invitacion.Id}", creada);
            });

            invitaciones.MapDelete("/{id:int}", async (int id, ServicioInvitaciones servicio, CancellationToken ct) =>
            {
                await servicio.RevocarAsync(id, ct);
                return TypedResults.NoContent();
            });

            var auth = rutas.MapGroup("/auth").WithTags("Autenticación");

            auth.MapPost("/invitacion", (ConsultarInvitacionDto dto, ServicioInvitaciones servicio, CancellationToken ct) =>
                servicio.ConsultarAsync(dto, ct))
                .AllowAnonymous()
                .RequireRateLimiting(AutenticacionEndpoints.PoliticaLimiteInicioSesion);

            // Crea la cuenta y deja la sesión iniciada, igual que el registro inicial.
            auth.MapPost("/activar", async (ActivarCuentaDto dto, ServicioInvitaciones servicio, CancellationToken ct) =>
            {
                var sesion = await servicio.ActivarAsync(dto, ct);
                return Results.SignIn(AutenticacionEndpoints.CrearPrincipal(sesion), authenticationScheme: BearerTokenDefaults.AuthenticationScheme);
            })
            .AllowAnonymous()
            .RequireRateLimiting(AutenticacionEndpoints.PoliticaLimiteInicioSesion);

            return rutas;
        }
    }
}
