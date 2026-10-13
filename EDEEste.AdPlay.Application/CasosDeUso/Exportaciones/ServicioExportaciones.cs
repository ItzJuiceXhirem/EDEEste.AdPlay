using EDEEste.AdPlay.Application.CasosDeUso.Publicaciones;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.Application.CasosDeUso.Exportaciones
{
    /// <summary>
    /// Genera paquetes ZIP de una publicación para el modo de reproducción local.
    /// </summary>
    public class ServicioExportaciones
    {
        private readonly IRepositorioExportaciones _exportaciones;
        private readonly IRepositorioPublicaciones _publicaciones;
        private readonly IAlmacenamientoMultimedia _almacenamiento;
        private readonly IGeneradorPaquetes _generador;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUsuarioActual _usuarioActual;
        private readonly TimeProvider _reloj;
        private readonly OpcionesReproductor _opciones;
        private readonly ILogger<ServicioExportaciones> _logger;

        public ServicioExportaciones(
            IRepositorioExportaciones exportaciones,
            IRepositorioPublicaciones publicaciones,
            IAlmacenamientoMultimedia almacenamiento,
            IGeneradorPaquetes generador,
            IUnidadDeTrabajo unidadDeTrabajo,
            IRegistroAuditoria auditoria,
            IUsuarioActual usuarioActual,
            TimeProvider reloj,
            IOptions<OpcionesReproductor> opciones,
            ILogger<ServicioExportaciones> logger)
        {
            _exportaciones = exportaciones;
            _publicaciones = publicaciones;
            _almacenamiento = almacenamiento;
            _generador = generador;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
            _usuarioActual = usuarioActual;
            _reloj = reloj;
            _opciones = opciones.Value;
            _logger = logger;
        }

        public async Task<IReadOnlyList<ExportacionDto>> ListarPorPublicacionAsync(int publicacionListaId, CancellationToken ct = default) =>
            (await _exportaciones.ListarPorPublicacionAsync(publicacionListaId, ct)).Select(e => e.ADto()).ToList();

        public async Task<ExportacionDto> GenerarAsync(int publicacionListaId, CancellationToken ct = default)
        {
            var publicacion = await _publicaciones.ObtenerConElementosAsync(publicacionListaId, ct)
                ?? throw new ExcepcionNoEncontrado("la publicación", publicacionListaId);
            if (publicacion.EstadoPublicacion != EstadoPublicacion.Publicada)
            {
                throw new ExcepcionConflicto("Solo se pueden exportar publicaciones vigentes.");
            }

            var ahora = _reloj.GetUtcNow().UtcDateTime;
            var exportacion = new Exportacion
            {
                PublicacionListaId = publicacion.Id,
                EstadoExportacion = EstadoExportacion.Generando,
                FechaSolicitudUtc = ahora,
                UsuarioSolicitanteId = _usuarioActual.Id
            };
            _exportaciones.Agregar(exportacion);
            _auditoria.Registrar(
                AccionAuditoria.Exportar,
                exportacion,
                $"Paquete de la lista '{publicacion.ListaReproduccion.Nombre}', versión {publicacion.NumeroVersion}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);

            var clave = ClavesAlmacenamiento.ParaExportacion();
            try
            {
                var manifiesto = ConstructorManifiesto.Construir(
                    publicacion, codigoPantalla: null, _opciones.IntervaloConsultaSegundos, ahora, paraPaquete: true);
                var archivos = publicacion.Elementos
                    .OrderBy(e => e.Posicion)
                    .Select(e => new ArchivoPaquete(
                        FormatoPaquete.RutaMedio(e.NombreArchivoPublicado),
                        e.ArchivoMultimedia.ClaveAlmacenamiento,
                        e.HashSha256))
                    .ToList();

                var paquete = await _generador.GenerarAsync(manifiesto, archivos, clave, ct);

                exportacion.ClaveAlmacenamiento = clave;
                exportacion.HashPaquete = paquete.HashSha256;
                exportacion.TamanoBytes = paquete.TamanoBytes;
                exportacion.EstadoExportacion = EstadoExportacion.Completada;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Falló la generación de la exportación {ExportacionId}", exportacion.Id);
                exportacion.EstadoExportacion = EstadoExportacion.Fallida;
                exportacion.DetalleError = ex is InvalidDataException
                    ? ex.Message
                    : "No se pudo generar el paquete. Consulte el registro del servidor.";
            }

            exportacion.FechaFinalizacionUtc = _reloj.GetUtcNow().UtcDateTime;
            await _unidadDeTrabajo.GuardarCambiosAsync(CancellationToken.None);
            return exportacion.ADto();
        }

        public async Task<DescargaExportacionDto> DescargarAsync(int id, CancellationToken ct = default)
        {
            var exportacion = await _exportaciones.ObtenerDetalleAsync(id, ct)
                ?? throw new ExcepcionNoEncontrado("la exportación", id);
            if (exportacion.EstadoExportacion != EstadoExportacion.Completada || exportacion.ClaveAlmacenamiento is null)
            {
                throw new ExcepcionConflicto("La exportación no está lista para descargarse.");
            }

            var publicacion = exportacion.PublicacionLista;
            var nombre = $"AdPlay_{NombreSeguro(publicacion.ListaReproduccion.Nombre)}_v{publicacion.NumeroVersion}.zip";
            var contenido = await _almacenamiento.AbrirLecturaAsync(exportacion.ClaveAlmacenamiento, ct);

            _auditoria.Registrar(AccionAuditoria.Exportar, exportacion, $"Descarga del paquete {nombre}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return new DescargaExportacionDto(contenido, nombre, exportacion.HashPaquete!);
        }

        private static string NombreSeguro(string nombre)
        {
            var invalidos = Path.GetInvalidFileNameChars();
            var limpio = new string(nombre.Select(c => invalidos.Contains(c) || char.IsWhiteSpace(c) ? '_' : c).ToArray());
            return limpio.Length > 50 ? limpio[..50] : limpio;
        }
    }
}
