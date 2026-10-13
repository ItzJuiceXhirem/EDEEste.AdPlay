using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using EDEEste.AdPlay.Application.DTOs;

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

            return rutas;
        }
    }
}
