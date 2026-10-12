using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Pantallas;
using EDEEste.AdPlay.Application.DTOs;

namespace EDEEste.AdPlay.API.Endpoints
{
    public static class PantallasEndpoints
    {
        public static IEndpointRouteBuilder MapearPantallas(this IEndpointRouteBuilder rutas)
        {
            var pantallas = rutas.MapGroup("/pantallas").WithTags("Pantallas");

            pantallas.MapGet("/", (int? sucursalId, int? grupoPantallaId, ServicioPantallas servicio, CancellationToken ct) =>
                servicio.ListarAsync(sucursalId, grupoPantallaId, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            pantallas.MapGet("/{id:int}", (int id, ServicioPantallas servicio, CancellationToken ct) => servicio.ObtenerAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            pantallas.MapPost("/", async (RegistrarPantallaDto dto, ServicioPantallas servicio, CancellationToken ct) =>
            {
                var creada = await servicio.RegistrarAsync(dto, ct);
                return TypedResults.Created($"/api/pantallas/{creada.Id}", creada);
            })
            .RequireAuthorization(PoliticasAcceso.Administracion);

            pantallas.MapPatch("/{id:int}", (int id, ActualizarPantallaDto dto, ServicioPantallas servicio, CancellationToken ct) =>
                servicio.ActualizarAsync(id, dto, ct))
                .RequireAuthorization(PoliticasAcceso.Administracion);

            pantallas.MapPost("/{id:int}/token", (int id, ServicioPantallas servicio, CancellationToken ct) =>
                servicio.GenerarTokenAsync(id, ct))
                .WithSummary("Genera o rota el token del dispositivo. Se muestra una sola vez.")
                .RequireAuthorization(PoliticasAcceso.Administracion);

            pantallas.MapDelete("/{id:int}/token", async (int id, ServicioPantallas servicio, CancellationToken ct) =>
            {
                await servicio.RevocarTokenAsync(id, ct);
                return TypedResults.NoContent();
            })
            .RequireAuthorization(PoliticasAcceso.Administracion);

            return rutas;
        }
    }
}
