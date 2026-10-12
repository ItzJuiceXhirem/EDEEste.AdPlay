using EDEEste.AdPlay.Application.CasosDeUso.Reproductor;
using EDEEste.AdPlay.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace EDEEste.AdPlay.API.Endpoints
{
    /// <summary>
    /// Endpoints del reproductor web. Se autentican con el token del dispositivo en la cabecera X-Token-Dispositivo.
    /// </summary>
    public static class ReproductorEndpoints
    {
        public const string CabeceraToken = "X-Token-Dispositivo";

        public static IEndpointRouteBuilder MapearReproductor(this IEndpointRouteBuilder rutas)
        {
            // Anónimos para el sistema de usuarios: cada petición se autentica con el token de la pantalla (ver ServicioReproductor).
            var reproductor = rutas.MapGroup("/reproductor").WithTags("Reproductor").AllowAnonymous();

            reproductor.MapGet("/manifiesto", async (
                [FromHeader(Name = CabeceraToken)] string? token,
                ServicioReproductor servicio,
                HttpContext http,
                CancellationToken ct) =>
            {
                var manifiesto = await servicio.ObtenerManifiestoAsync(token ?? string.Empty, ct);

                // La etiqueta solo depende del contenido, así el reproductor recibe 304 si no hubo cambios.
                var etiqueta = new EntityTagHeaderValue($"\"{manifiesto.Version ?? "sin-contenido"}-{(manifiesto.Habilitada ? 1 : 0)}\"");
                http.Response.Headers.ETag = etiqueta.ToString();
                http.Response.Headers.CacheControl = "no-cache";

                var recibidas = http.Request.GetTypedHeaders().IfNoneMatch;
                if (recibidas.Any(e => e.Compare(etiqueta, useStrongComparison: false)))
                {
                    return Results.StatusCode(StatusCodes.Status304NotModified);
                }

                return Results.Ok(manifiesto);
            });

            reproductor.MapGet("/medios/{id:int}", async (
                int id,
                [FromHeader(Name = CabeceraToken)] string? token,
                ServicioReproductor servicio,
                CancellationToken ct) =>
            {
                var contenido = await servicio.ObtenerMedioAsync(token ?? string.Empty, id, ct);
                return TypedResults.Stream(
                    contenido.Contenido,
                    contenido.TipoMime,
                    entityTag: new EntityTagHeaderValue($"\"{contenido.HashSha256}\""),
                    enableRangeProcessing: true);
            });

            reproductor.MapPost("/latido", async (
                [FromHeader(Name = CabeceraToken)] string? token,
                LatidoDto dto,
                ServicioReproductor servicio,
                CancellationToken ct) =>
            {
                await servicio.RegistrarLatidoAsync(token ?? string.Empty, dto, ct);
                return TypedResults.NoContent();
            });

            return rutas;
        }
    }
}
