using EDEEste.AdPlay.Application.Comunes;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.CasosDeUso.Anuncios
{
    public class ServicioAnuncios
    {
        private readonly IRepositorioAnuncios _anuncios;
        private readonly IRepositorioMultimedia _multimedia;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUsuarioActual _usuarioActual;
        private readonly TimeProvider _reloj;

        public ServicioAnuncios(
            IRepositorioAnuncios anuncios,
            IRepositorioMultimedia multimedia,
            IUnidadDeTrabajo unidadDeTrabajo,
            IRegistroAuditoria auditoria,
            IUsuarioActual usuarioActual,
            TimeProvider reloj)
        {
            _anuncios = anuncios;
            _multimedia = multimedia;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
            _usuarioActual = usuarioActual;
            _reloj = reloj;
        }

        public async Task<IReadOnlyList<AnuncioDto>> ListarAsync(CancellationToken ct = default) =>
            (await _anuncios.ListarAsync(ct)).Select(a => a.ADto()).ToList();

        public async Task<AnuncioDto> ObtenerAsync(int id, CancellationToken ct = default) =>
            (await ObtenerEntidadAsync(id, ct)).ADto();

        public async Task<AnuncioDto> CrearAsync(GuardarAnuncioDto dto, CancellationToken ct = default)
        {
            ValidadorAnuncios.Validar(dto);
            var anuncio = new Anuncio
            {
                ArchivoMultimedia = await ObtenerArchivoUtilizableAsync(dto.ArchivoMultimediaId, ct),
                ArchivoMultimediaId = dto.ArchivoMultimediaId,
                FechaCreacionUtc = _reloj.GetUtcNow().UtcDateTime,
                UsuarioCreadorId = _usuarioActual.Id
            };
            Aplicar(anuncio, dto);

            _anuncios.Agregar(anuncio);
            _auditoria.Registrar(AccionAuditoria.Crear, anuncio, $"Anuncio '{anuncio.Titulo}'");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return anuncio.ADto();
        }

        public async Task<AnuncioDto> ActualizarAsync(int id, GuardarAnuncioDto dto, CancellationToken ct = default)
        {
            ValidadorAnuncios.Validar(dto);
            var anuncio = await ObtenerEntidadAsync(id, ct);
            var estabaActivo = anuncio.EstaActivo;
            if (anuncio.ArchivoMultimediaId != dto.ArchivoMultimediaId)
            {
                anuncio.ArchivoMultimedia = await ObtenerArchivoUtilizableAsync(dto.ArchivoMultimediaId, ct);
                anuncio.ArchivoMultimediaId = dto.ArchivoMultimediaId;
            }

            Aplicar(anuncio, dto);
            _auditoria.Registrar(
                AuditoriaExtensions.AccionDeEdicion(estabaActivo, anuncio.EstaActivo),
                anuncio,
                $"Anuncio '{anuncio.Titulo}'");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return anuncio.ADto();
        }

        private static void Aplicar(Anuncio anuncio, GuardarAnuncioDto dto)
        {
            anuncio.Titulo = dto.Titulo.Trim();
            anuncio.Descripcion = dto.Descripcion.ANuloSiVacio();
            anuncio.DuracionPredeterminadaSegundos = dto.DuracionPredeterminadaSegundos;
            anuncio.EstaActivo = dto.EstaActivo;
        }

        private async Task<Anuncio> ObtenerEntidadAsync(int id, CancellationToken ct) =>
            await _anuncios.ObtenerPorIdAsync(id, ct) ?? throw new ExcepcionNoEncontrado("el anuncio", id);

        private async Task<ArchivoMultimedia> ObtenerArchivoUtilizableAsync(int archivoId, CancellationToken ct)
        {
            var archivo = await _multimedia.ObtenerPorIdAsync(archivoId, ct)
                ?? throw new ExcepcionValidacion(nameof(GuardarAnuncioDto.ArchivoMultimediaId), "El archivo multimedia no existe.");
            if (archivo.EstaArchivado)
            {
                throw new ExcepcionValidacion(nameof(GuardarAnuncioDto.ArchivoMultimediaId), "El archivo multimedia está archivado.");
            }

            return archivo;
        }
    }
}
