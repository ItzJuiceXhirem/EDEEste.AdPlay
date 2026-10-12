using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.Application.CasosDeUso.Multimedia
{
    public class ServicioMultimedia
    {
        private readonly IRepositorioMultimedia _multimedia;
        private readonly IAlmacenamientoMultimedia _almacenamiento;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUsuarioActual _usuarioActual;
        private readonly TimeProvider _reloj;
        private readonly OpcionesMultimedia _opciones;

        public ServicioMultimedia(
            IRepositorioMultimedia multimedia,
            IAlmacenamientoMultimedia almacenamiento,
            IUnidadDeTrabajo unidadDeTrabajo,
            IRegistroAuditoria auditoria,
            IUsuarioActual usuarioActual,
            TimeProvider reloj,
            IOptions<OpcionesMultimedia> opciones)
        {
            _multimedia = multimedia;
            _almacenamiento = almacenamiento;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
            _usuarioActual = usuarioActual;
            _reloj = reloj;
            _opciones = opciones.Value;
        }

        public async Task<IReadOnlyList<ArchivoMultimediaDto>> ListarAsync(bool incluirArchivados, CancellationToken ct = default) =>
            (await _multimedia.ListarAsync(incluirArchivados, ct)).Select(a => a.ADto()).ToList();

        public async Task<ArchivoMultimediaDto> ObtenerAsync(int id, CancellationToken ct = default) =>
            (await ObtenerEntidadAsync(id, ct)).ADto();

        /// <summary>
        /// Valida y guarda un archivo. Si ya existe uno con el mismo contenido (hash), se reutiliza.
        /// </summary>
        public async Task<ArchivoMultimediaDto> CargarAsync(CargarArchivoMultimediaDto dto, CancellationToken ct = default)
        {
            var nombreOriginal = Path.GetFileName(dto.NombreOriginal ?? string.Empty);
            if (string.IsNullOrWhiteSpace(nombreOriginal) || nombreOriginal.Length > LongitudesMaximas.NombreArchivo)
            {
                throw new ExcepcionValidacion("Archivo", "El nombre del archivo no es válido.");
            }

            if (!dto.Contenido.CanSeek)
            {
                throw new InvalidOperationException("El flujo de carga debe permitir Seek para verificar la firma del archivo.");
            }

            var cabecera = new byte[ValidadorArchivosMultimedia.BytesCabecera];
            var leidos = await dto.Contenido.ReadAtLeastAsync(cabecera, cabecera.Length, throwOnEndOfStream: false, ct);
            dto.Contenido.Seek(0, SeekOrigin.Begin);

            var (tipo, tipoMime, extension) = ValidadorArchivosMultimedia.Validar(
                nombreOriginal, dto.TipoMime, dto.Longitud, cabecera.AsMemory(0, leidos), _opciones);

            if (dto.DuracionSegundos.HasValue && !ReglasDuracion.EsValida(dto.DuracionSegundos.Value))
            {
                throw new ExcepcionValidacion(nameof(dto.DuracionSegundos),
                    $"Debe estar entre {ReglasDuracion.MinimoSegundos} y {ReglasDuracion.MaximoSegundos}.");
            }

            var ahora = _reloj.GetUtcNow().UtcDateTime;
            var clave = ClavesAlmacenamiento.ParaMedio(ahora, extension);
            var guardado = await _almacenamiento.GuardarAsync(clave, dto.Contenido, ct);

            var existente = await _multimedia.ObtenerPorHashAsync(guardado.HashSha256, ct);
            if (existente is not null)
            {
                await _almacenamiento.EliminarAsync(clave, ct);
                if (existente.EstaArchivado)
                {
                    existente.EstaArchivado = false;
                    _auditoria.Registrar(AccionAuditoria.Restaurar, existente, $"Archivo '{existente.NombreOriginal}' (se volvió a subir)");
                    await _unidadDeTrabajo.GuardarCambiosAsync(ct);
                }

                return existente.ADto();
            }

            var archivo = new ArchivoMultimedia
            {
                NombreOriginal = nombreOriginal,
                ClaveAlmacenamiento = clave,
                TipoMultimedia = tipo,
                TipoMime = tipoMime,
                TamanoBytes = guardado.TamanoBytes,
                HashSha256 = guardado.HashSha256,
                DuracionSegundos = tipo == TipoMultimedia.Video ? dto.DuracionSegundos : null,
                FechaCargaUtc = ahora,
                UsuarioCargaId = _usuarioActual.Id
            };

            _multimedia.Agregar(archivo);
            _auditoria.Registrar(AccionAuditoria.Crear, archivo, $"Archivo '{archivo.NombreOriginal}' ({archivo.TipoMultimedia})");
            try
            {
                await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            }
            catch
            {
                await _almacenamiento.EliminarAsync(clave, CancellationToken.None);
                throw;
            }

            return archivo.ADto();
        }

        /// <summary>
        /// Archiva el medio: deja de ofrecerse para anuncios nuevos, pero no se borra porque puede estar en publicaciones.
        /// </summary>
        public async Task<ArchivoMultimediaDto> ArchivarAsync(int id, bool archivar, CancellationToken ct = default)
        {
            var archivo = await ObtenerEntidadAsync(id, ct);
            archivo.EstaArchivado = archivar;
            _auditoria.Registrar(
                archivar ? AccionAuditoria.Archivar : AccionAuditoria.Restaurar,
                archivo,
                $"Archivo '{archivo.NombreOriginal}'");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return archivo.ADto();
        }

        public async Task<ContenidoArchivoDto> ObtenerContenidoAsync(int id, CancellationToken ct = default)
        {
            var archivo = await ObtenerEntidadAsync(id, ct);
            var contenido = await _almacenamiento.AbrirLecturaAsync(archivo.ClaveAlmacenamiento, ct);
            return new ContenidoArchivoDto(contenido, archivo.TipoMime, archivo.HashSha256);
        }

        private async Task<ArchivoMultimedia> ObtenerEntidadAsync(int id, CancellationToken ct) =>
            await _multimedia.ObtenerPorIdAsync(id, ct) ?? throw new ExcepcionNoEncontrado("el archivo multimedia", id);
    }
}
