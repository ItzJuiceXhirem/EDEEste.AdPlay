using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Anuncios;
using EDEEste.AdPlay.Application.CasosDeUso.Multimedia;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

namespace EDEEste.AdPlay.API.Endpoints
{
    /// <summary>Contenido: consultar es libre; preparar archivos y anuncios lo pueden hacer administradores y operadores.</summary>
    public static class MultimediaEndpoints
    {
        public static IEndpointRouteBuilder MapearMultimedia(this IEndpointRouteBuilder rutas)
        {
            var multimedia = rutas.MapGroup("/multimedia").WithTags("Multimedia");
            var limiteCarga = rutas.ServiceProvider.GetRequiredService<IOptions<OpcionesMultimedia>>().Value.TamanoMaximoSolicitudBytes;

            multimedia.MapGet("/", (bool? incluirArchivados, ServicioMultimedia servicio, CancellationToken ct) =>
                servicio.ListarAsync(incluirArchivados ?? false, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            multimedia.MapGet("/{id:int}", (int id, ServicioMultimedia servicio, CancellationToken ct) => servicio.ObtenerAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            multimedia.MapPost("/", async (
                IFormFile? archivo,
                [FromForm] int? duracionSegundos,
                ServicioMultimedia servicio,
                CancellationToken ct) =>
            {
                if (archivo is null)
                {
                    throw new ExcepcionValidacion("Archivo", "Adjunte un archivo en el campo 'archivo'.");
                }

                await using var contenido = archivo.OpenReadStream();
                var cargado = await servicio.CargarAsync(
                    new CargarArchivoMultimediaDto(contenido, archivo.FileName, archivo.ContentType, archivo.Length, duracionSegundos),
                    ct);
                return TypedResults.Created($"/api/multimedia/{cargado.Id}", cargado);
            })
            .DisableAntiforgery()
            // El límite global de Kestrel (~30 MB) sigue aplicando al resto de endpoints; solo la carga admite archivos grandes.
            .WithMetadata(new RequestSizeLimitAttribute(limiteCarga))
            .RequireAuthorization(PoliticasAcceso.Contenido);

            multimedia.MapPatch("/{id:int}", (int id, CambiarArchivadoDto dto, ServicioMultimedia servicio, CancellationToken ct) =>
                servicio.ArchivarAsync(id, dto.EstaArchivado, ct))
                .RequireAuthorization(PoliticasAcceso.Contenido);

            multimedia.MapGet("/{id:int}/contenido", async (int id, ServicioMultimedia servicio, CancellationToken ct) =>
            {
                var contenido = await servicio.ObtenerContenidoAsync(id, ct);
                return TypedResults.Stream(
                    contenido.Contenido,
                    contenido.TipoMime,
                    entityTag: new EntityTagHeaderValue($"\"{contenido.HashSha256}\""),
                    enableRangeProcessing: true);
            })
            .RequireAuthorization(PoliticasAcceso.Lectura);

            var anuncios = rutas.MapGroup("/anuncios").WithTags("Anuncios");

            anuncios.MapGet("/", (ServicioAnuncios servicio, CancellationToken ct) => servicio.ListarAsync(ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            anuncios.MapGet("/{id:int}", (int id, ServicioAnuncios servicio, CancellationToken ct) => servicio.ObtenerAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            anuncios.MapPost("/", async (GuardarAnuncioDto dto, ServicioAnuncios servicio, CancellationToken ct) =>
            {
                var creado = await servicio.CrearAsync(dto, ct);
                return TypedResults.Created($"/api/anuncios/{creado.Id}", creado);
            })
            .RequireAuthorization(PoliticasAcceso.Contenido);

            anuncios.MapPut("/{id:int}", (int id, GuardarAnuncioDto dto, ServicioAnuncios servicio, CancellationToken ct) =>
                servicio.ActualizarAsync(id, dto, ct))
                .RequireAuthorization(PoliticasAcceso.Contenido);

            return rutas;
        }
    }
}
