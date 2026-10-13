using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Sucursales;
using EDEEste.AdPlay.Application.DTOs;

namespace EDEEste.AdPlay.API.Endpoints
{
    /// <summary>Estructura de la empresa: consultar es libre; crear y modificar es de administración.</summary>
    public static class SucursalesEndpoints
    {
        public static IEndpointRouteBuilder MapearSucursales(this IEndpointRouteBuilder rutas)
        {
            var sucursales = rutas.MapGroup("/sucursales").WithTags("Sucursales");

            sucursales.MapGet("/", (ServicioSucursales servicio, CancellationToken ct) => servicio.ListarAsync(ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            sucursales.MapGet("/{id:int}", (int id, ServicioSucursales servicio, CancellationToken ct) => servicio.ObtenerAsync(id, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            sucursales.MapPost("/", async (GuardarSucursalDto dto, ServicioSucursales servicio, CancellationToken ct) =>
            {
                var creada = await servicio.CrearAsync(dto, ct);
                return TypedResults.Created($"/api/sucursales/{creada.Id}", creada);
            })
            .RequireAuthorization(PoliticasAcceso.Administracion);

            sucursales.MapPut("/{id:int}", (int id, GuardarSucursalDto dto, ServicioSucursales servicio, CancellationToken ct) =>
                servicio.ActualizarAsync(id, dto, ct))
                .RequireAuthorization(PoliticasAcceso.Administracion);

            var grupos = rutas.MapGroup("/grupos-pantallas").WithTags("Grupos de pantallas");

            grupos.MapGet("/", (int? sucursalId, ServicioGruposPantallas servicio, CancellationToken ct) =>
                servicio.ListarAsync(sucursalId, ct))
                .RequireAuthorization(PoliticasAcceso.Lectura);

            grupos.MapPost("/", async (GuardarGrupoPantallaDto dto, ServicioGruposPantallas servicio, CancellationToken ct) =>
            {
                var creado = await servicio.CrearAsync(dto, ct);
                return TypedResults.Created($"/api/grupos-pantallas/{creado.Id}", creado);
            })
            .RequireAuthorization(PoliticasAcceso.Administracion);

            grupos.MapPut("/{id:int}", (int id, GuardarGrupoPantallaDto dto, ServicioGruposPantallas servicio, CancellationToken ct) =>
                servicio.ActualizarAsync(id, dto, ct))
                .RequireAuthorization(PoliticasAcceso.Administracion);

            return rutas;
        }
    }
}
