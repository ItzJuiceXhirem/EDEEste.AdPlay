using EDEEste.AdPlay.API.Seguridad;
using EDEEste.AdPlay.Application.CasosDeUso.Auditoria;
using EDEEste.AdPlay.Application.CasosDeUso.Historial;
using EDEEste.AdPlay.Application.CasosDeUso.Reportes;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.API.Endpoints
{
    /// <summary>
    /// Consultas transversales: auditoría, historial de publicaciones y exportaciones, y reportes operativos.
    /// </summary>
    public static class ConsultasEndpoints
    {
        public static IEndpointRouteBuilder MapearConsultas(this IEndpointRouteBuilder rutas)
        {
            rutas.MapGet("/auditoria", (
                DateTime? desde,
                DateTime? hasta,
                int? usuarioId,
                AccionAuditoria? accion,
                string? tipoEntidad,
                int? pagina,
                int? tamanoPagina,
                ServicioAuditoria servicio,
                CancellationToken ct) =>
                servicio.ListarAsync(
                    new FiltroAuditoria(desde?.ToUniversalTime(), hasta?.ToUniversalTime(), usuarioId, accion, tipoEntidad),
                    pagina,
                    tamanoPagina,
                    ct))
                .WithTags("Auditoría")
                .RequireAuthorization(PoliticasAcceso.Administracion);

            rutas.MapGet("/auditoria/resumen", (
                DateTime? desde,
                DateTime? hasta,
                int? usuarioId,
                AccionAuditoria? accion,
                string? tipoEntidad,
                ServicioAuditoria servicio,
                CancellationToken ct) =>
                servicio.ResumirAsync(
                    new FiltroAuditoria(desde?.ToUniversalTime(), hasta?.ToUniversalTime(), usuarioId, accion, tipoEntidad),
                    ct))
                .WithTags("Auditoría")
                .WithSummary("Totales de los registros que cumplen el filtro, sin paginar.")
                .RequireAuthorization(PoliticasAcceso.Administracion);

            var historial = rutas.MapGroup("/historial").WithTags("Historial")
                .RequireAuthorization(PoliticasAcceso.Lectura);

            historial.MapGet("/resumen", (
                int? listaReproduccionId,
                DateTime? desde,
                DateTime? hasta,
                ServicioHistorial servicio,
                CancellationToken ct) =>
                servicio.ResumirAsync(new FiltroHistorial(listaReproduccionId, desde?.ToUniversalTime(), hasta?.ToUniversalTime()), ct))
                .WithSummary("Totales de publicaciones y paquetes que cumplen el filtro, sin paginar.");

            historial.MapGet("/publicaciones", (
                int? listaReproduccionId,
                DateTime? desde,
                DateTime? hasta,
                int? pagina,
                int? tamanoPagina,
                ServicioHistorial servicio,
                CancellationToken ct) =>
                servicio.ListarPublicacionesAsync(
                    new FiltroHistorial(listaReproduccionId, desde?.ToUniversalTime(), hasta?.ToUniversalTime()), pagina, tamanoPagina, ct));

            historial.MapGet("/exportaciones", (
                int? listaReproduccionId,
                DateTime? desde,
                DateTime? hasta,
                int? pagina,
                int? tamanoPagina,
                ServicioHistorial servicio,
                CancellationToken ct) =>
                servicio.ListarExportacionesAsync(
                    new FiltroHistorial(listaReproduccionId, desde?.ToUniversalTime(), hasta?.ToUniversalTime()), pagina, tamanoPagina, ct));

            rutas.MapGet("/reportes/estado-pantallas", (ServicioReportes servicio, CancellationToken ct) =>
                servicio.EstadoPantallasAsync(ct))
                .WithTags("Reportes")
                .WithSummary("Cada pantalla con la versión que debería reproducir y la que informó haber cargado.")
                .RequireAuthorization(PoliticasAcceso.Lectura);

            return rutas;
        }
    }
}
