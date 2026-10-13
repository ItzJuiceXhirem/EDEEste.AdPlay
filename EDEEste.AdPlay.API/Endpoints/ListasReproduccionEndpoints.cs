using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Asignaciones;
using EDEEste.AdPlay.Application.CasosDeUso.ListasReproduccion;
using EDEEste.AdPlay.Application.CasosDeUso.Publicaciones;
using EDEEste.AdPlay.Application.DTOs;

namespace EDEEste.AdPlay.API.Endpoints
{
    /// <summary>
    /// Armar listas es de contenido (administrador u operador). Decidir dónde se muestran (asignaciones) y publicar
    /// una versión es de administración.
    /// </summary>
    public static class ListasReproduccionEndpoints
    {
        public static IEndpointRouteBuilder MapearListasReproduccion(this IEndpointRouteBuilder rutas)
        {
            var listas = rutas.MapGroup("/listas-reproduccion").WithTags("Listas de reproducción");

            listas.MapGet("/", (ServicioListasReproduccion servicio, CancellationToken ct) => servicio.ListarAsync(ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            listas.MapGet("/{id:int}", (int id, ServicioListasReproduccion servicio, CancellationToken ct) =>
                servicio.ObtenerAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            listas.MapPost("/", async (GuardarListaReproduccionDto dto, ServicioListasReproduccion servicio, CancellationToken ct) =>
            {
                var creada = await servicio.CrearAsync(dto, ct);
                return TypedResults.Created($"/api/listas-reproduccion/{creada.Id}", creada);
            })
            .RequireAuthorization(PoliticasAcceso.Contenido);

            listas.MapPut("/{id:int}", (int id, GuardarListaReproduccionDto dto, ServicioListasReproduccion servicio, CancellationToken ct) =>
                servicio.ActualizarAsync(id, dto, ct))
                .RequireAuthorization(PoliticasAcceso.Contenido);

            listas.MapPost("/{id:int}/publicar", async (int id, ServicioPublicaciones servicio, CancellationToken ct) =>
            {
                var publicada = await servicio.PublicarAsync(id, ct);
                return TypedResults.Created($"/api/publicaciones/{publicada.Id}", publicada);
            })
            .WithSummary("Valida la lista y crea una versión inmutable.")
            .RequireAuthorization(PoliticasAcceso.Administracion);

            listas.MapGet("/{id:int}/publicaciones", (int id, ServicioPublicaciones servicio, CancellationToken ct) =>
                servicio.ListarPorListaAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            var asignaciones = rutas.MapGroup("/asignaciones").WithTags("Asignaciones");

            asignaciones.MapGet("/", (int? listaReproduccionId, ServicioAsignaciones servicio, CancellationToken ct) =>
                servicio.ListarAsync(listaReproduccionId, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            asignaciones.MapPost("/", async (GuardarAsignacionDto dto, ServicioAsignaciones servicio, CancellationToken ct) =>
            {
                var creada = await servicio.CrearAsync(dto, ct);
                return TypedResults.Created($"/api/asignaciones/{creada.Id}", creada);
            })
            .RequireAuthorization(PoliticasAcceso.Administracion);

            asignaciones.MapPut("/{id:int}", (int id, GuardarAsignacionDto dto, ServicioAsignaciones servicio, CancellationToken ct) =>
                servicio.ActualizarAsync(id, dto, ct))
                .RequireAuthorization(PoliticasAcceso.Administracion);

            asignaciones.MapDelete("/{id:int}", async (int id, ServicioAsignaciones servicio, CancellationToken ct) =>
            {
                await servicio.EliminarAsync(id, ct);
                return TypedResults.NoContent();
            })
            .RequireAuthorization(PoliticasAcceso.Administracion);

            return rutas;
        }
    }
}
