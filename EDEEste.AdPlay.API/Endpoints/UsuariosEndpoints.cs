using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

namespace EDEEste.AdPlay.API.Endpoints
{
    public static class UsuariosEndpoints
    {
        public static IEndpointRouteBuilder MapearUsuarios(this IEndpointRouteBuilder rutas)
        {
            var usuarios = rutas.MapGroup("/usuarios").WithTags("Usuarios")
                .RequireAuthorization(PoliticasAcceso.Administracion);

            usuarios.MapGet("/", (ServicioUsuarios servicio, CancellationToken ct) => servicio.ListarAsync(ct));

            usuarios.MapPost("/", async (CrearUsuarioDto dto, ServicioUsuarios servicio, CancellationToken ct) =>
            {
                var creado = await servicio.CrearAsync(dto, ct);
                return TypedResults.Created($"/api/usuarios/{creado.Id}", creado);
            });

            usuarios.MapPut("/{id:int}", (int id, ActualizarUsuarioDto dto, ServicioUsuarios servicio, CancellationToken ct) =>
                servicio.ActualizarAsync(id, dto, ct));

            usuarios.MapPost("/{id:int}/restablecer-clave", async (int id, RestablecerClaveDto dto, ServicioUsuarios servicio, CancellationToken ct) =>
            {
                await servicio.RestablecerClaveAsync(id, dto, ct);
                return TypedResults.NoContent();
            });

            // El propio usuario cambia su clave; no requiere ser administrador.
            rutas.MapPost("/auth/cambiar-clave", async (CambiarClaveDto dto, ServicioUsuarios servicio, CancellationToken ct) =>
            {
                await servicio.CambiarClaveAsync(dto, ct);
                return TypedResults.NoContent();
            })
            .WithTags("Autenticación")
            .RequireAuthorization(PoliticasAcceso.Lectura);

            MapearFotoPerfil(rutas);
            return rutas;
        }

        /// <summary>Cada persona cambia o quita su propia foto; cualquiera con sesión puede verlas.</summary>
        private static void MapearFotoPerfil(IEndpointRouteBuilder rutas)
        {
            var limiteCarga = rutas.ServiceProvider.GetRequiredService<IOptions<OpcionesMultimedia>>().Value.TamanoMaximoSolicitudFotoBytes;

            rutas.MapPut("/auth/foto", async (IFormFile? archivo, ServicioFotoPerfil servicio, CancellationToken ct) =>
            {
                if (archivo is null)
                {
                    throw new ExcepcionValidacion("Archivo", "Adjunte la imagen en el campo 'archivo'.");
                }

                await using var contenido = archivo.OpenReadStream();
                return await servicio.CambiarAsync(
                    new CargarFotoPerfilDto(contenido, archivo.FileName, archivo.ContentType, archivo.Length), ct);
            })
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(limiteCarga))
            .WithTags("Autenticación")
            .RequireAuthorization(PoliticasAcceso.Lectura);

            rutas.MapDelete("/auth/foto", async (ServicioFotoPerfil servicio, CancellationToken ct) =>
            {
                await servicio.QuitarAsync(ct);
                return TypedResults.NoContent();
            })
            .WithTags("Autenticación")
            .RequireAuthorization(PoliticasAcceso.Lectura);

            // La URL lleva la versión (?v=), así que el navegador puede guardar la imagen sin volver a pedirla.
            rutas.MapGet("/usuarios/{id:int}/foto", async (int id, ServicioFotoPerfil servicio, HttpContext http, CancellationToken ct) =>
            {
                var foto = await servicio.ObtenerAsync(id, ct);
                http.Response.Headers.CacheControl = "private, max-age=31536000, immutable";
                return TypedResults.Stream(foto.Contenido, foto.TipoMime, entityTag: new EntityTagHeaderValue($"\"{foto.FotoVersion}\""));
            })
            .WithTags("Usuarios")
            .RequireAuthorization(PoliticasAcceso.Lectura);
        }
    }
}
