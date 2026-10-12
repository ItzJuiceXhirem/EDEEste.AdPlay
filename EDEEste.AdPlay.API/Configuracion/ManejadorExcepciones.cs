using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace EDEEste.AdPlay.API.Configuracion
{
    /// <summary>
    /// Traduce excepciones a ProblemDetails. Nunca devuelve trazas de pila; los errores inesperados
    /// se registran en el servidor y se correlacionan con el traceId de la respuesta.
    /// </summary>
    public sealed class ManejadorExcepciones : IExceptionHandler
    {
        /// <summary>Código no estándar, ampliamente usado, para peticiones abortadas por el cliente.</summary>
        private const int StatusClienteCerroConexion = 499;

        private readonly IProblemDetailsService _problemDetails;
        private readonly ILogger<ManejadorExcepciones> _logger;

        public ManejadorExcepciones(IProblemDetailsService problemDetails, ILogger<ManejadorExcepciones> logger)
        {
            _problemDetails = problemDetails;
            _logger = logger;
        }

        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            // El cliente cerró la conexión (por ejemplo, un televisor cambió de página): no es un error del servidor.
            if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
            {
                httpContext.Response.StatusCode = StatusClienteCerroConexion;
                return true;
            }

            ProblemDetails problema = exception switch
            {
                ExcepcionValidacion ev => new ValidationProblemDetails(ev.Errores)
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = ev.Message
                },
                ExcepcionDominio => Crear(StatusCodes.Status400BadRequest, "Regla de negocio no cumplida", exception.Message),
                ExcepcionNoEncontrado => Crear(StatusCodes.Status404NotFound, "No encontrado", exception.Message),
                FileNotFoundException => Crear(StatusCodes.Status404NotFound, "Archivo no disponible", "El archivo solicitado no está en el almacenamiento."),
                ExcepcionConflicto => Crear(StatusCodes.Status409Conflict, "Conflicto", exception.Message),
                ExcepcionNoAutorizado => Crear(StatusCodes.Status401Unauthorized, "No autorizado", exception.Message),
                BadHttpRequestException bad => Crear(bad.StatusCode, "Solicitud no válida", "La solicitud no tiene el formato esperado."),
                _ => Crear(StatusCodes.Status500InternalServerError, "Error interno", "Ocurrió un error inesperado. Comuníquelo con el identificador de la solicitud.")
            };

            if (problema.Status == StatusCodes.Status500InternalServerError)
            {
                _logger.LogError(exception, "Error no controlado en {Metodo} {Ruta}", httpContext.Request.Method, httpContext.Request.Path);
            }

            httpContext.Response.StatusCode = problema.Status!.Value;
            return await _problemDetails.TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = httpContext,
                ProblemDetails = problema,
                Exception = exception
            });
        }

        private static ProblemDetails Crear(int estado, string titulo, string detalle) =>
            new() { Status = estado, Title = titulo, Detail = detalle };
    }
}
