using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Exportaciones;
using EDEEste.AdPlay.Application.CasosDeUso.Publicaciones;

namespace EDEEste.AdPlay.API.Endpoints
{
    public static class PublicacionesEndpoints
    {
        /// <summary>Hash SHA-256 del paquete ZIP, para que quien lo descarga pueda verificarlo.</summary>
        public const string CabeceraHashPaquete = "X-Hash-Sha256";

        public static IEndpointRouteBuilder MapearPublicaciones(this IEndpointRouteBuilder rutas)
        {
            var publicaciones = rutas.MapGroup("/publicaciones").WithTags("Publicaciones");

            publicaciones.MapGet("/{id:int}", (int id, ServicioPublicaciones servicio, CancellationToken ct) =>
                servicio.ObtenerAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            publicaciones.MapPost("/{id:int}/retirar", (int id, ServicioPublicaciones servicio, CancellationToken ct) =>
                servicio.RetirarAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Administracion);

            publicaciones.MapGet("/{id:int}/exportaciones", (int id, ServicioExportaciones servicio, CancellationToken ct) =>
                servicio.ListarPorPublicacionAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            // Exportar no cambia lo que muestran las pantallas, así que también lo puede hacer un operador.
            publicaciones.MapPost("/{id:int}/exportaciones", (int id, ServicioExportaciones servicio, CancellationToken ct) =>
                servicio.GenerarAsync(id, ct))
                .WithSummary("Genera el paquete ZIP de la publicación para reproducción local.")
                .RequireAuthorization(PoliticasAcceso.Contenido);

            rutas.MapGet("/exportaciones/{id:int}/descarga", async (int id, ServicioExportaciones servicio, HttpContext http, CancellationToken ct) =>
            {
                var descarga = await servicio.DescargarAsync(id, ct);
                http.Response.Headers[CabeceraHashPaquete] = descarga.HashPaquete;
                return TypedResults.Stream(descarga.Contenido, "application/zip", descarga.NombreArchivo);
            })
            .WithTags("Publicaciones")
            .RequireAuthorization(PoliticasAcceso.Contenido);

            return rutas;
        }
    }
}
