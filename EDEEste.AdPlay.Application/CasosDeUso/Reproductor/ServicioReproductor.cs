using EDEEste.AdPlay.Application.CasosDeUso.Pantallas;
using EDEEste.AdPlay.Application.CasosDeUso.Publicaciones;
using EDEEste.AdPlay.Application.Comunes;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Services;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.Application.CasosDeUso.Reproductor
{
    /// <summary>
    /// Casos de uso que consume el reproductor web, autenticado con el token de su pantalla.
    /// </summary>
    public class ServicioReproductor
    {
        private readonly IRepositorioPantallas _pantallas;
        private readonly IRepositorioGruposPantallas _grupos;
        private readonly IRepositorioAsignaciones _asignaciones;
        private readonly IRepositorioPublicaciones _publicaciones;
        private readonly IAlmacenamientoMultimedia _almacenamiento;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly TimeProvider _reloj;
        private readonly OpcionesReproductor _opciones;

        public ServicioReproductor(
            IRepositorioPantallas pantallas,
            IRepositorioGruposPantallas grupos,
            IRepositorioAsignaciones asignaciones,
            IRepositorioPublicaciones publicaciones,
            IAlmacenamientoMultimedia almacenamiento,
            IUnidadDeTrabajo unidadDeTrabajo,
            TimeProvider reloj,
            IOptions<OpcionesReproductor> opciones)
        {
            _pantallas = pantallas;
            _grupos = grupos;
            _asignaciones = asignaciones;
            _publicaciones = publicaciones;
            _almacenamiento = almacenamiento;
            _unidadDeTrabajo = unidadDeTrabajo;
            _reloj = reloj;
            _opciones = opciones.Value;
        }

        /// <summary>
        /// Devuelve la versión publicada que debe reproducir la pantalla, o un manifiesto vacío si está
        /// deshabilitada o no tiene ninguna lista publicada aplicable.
        /// </summary>
        public async Task<ManifiestoDto> ObtenerManifiestoAsync(string token, CancellationToken ct = default)
        {
            var pantalla = await AutenticarAsync(token, ct);
            var ahora = _reloj.GetUtcNow().UtcDateTime;
            var intervalo = _opciones.IntervaloConsultaSegundos;

            if (!pantalla.EstaHabilitada)
            {
                return ConstructorManifiesto.Vacio(pantalla.CodigoPantalla, habilitada: false, intervalo, ahora);
            }

            var publicacion = await ResolverPublicacionAsync(pantalla, ahora, ct);
            return publicacion is null
                ? ConstructorManifiesto.Vacio(pantalla.CodigoPantalla, habilitada: true, intervalo, ahora)
                : ConstructorManifiesto.Construir(publicacion, pantalla.CodigoPantalla, intervalo, ahora, paraPaquete: false);
        }

        /// <summary>
        /// Entrega un medio solo si forma parte de la versión que la pantalla debe reproducir ahora: un dispositivo
        /// no puede descargar contenido de otras sucursales ni anuncios sin publicar.
        /// </summary>
        public async Task<ContenidoArchivoDto> ObtenerMedioAsync(string token, int archivoMultimediaId, CancellationToken ct = default)
        {
            var pantalla = await AutenticarAsync(token, ct);
            var publicacion = pantalla.EstaHabilitada
                ? await ResolverPublicacionAsync(pantalla, _reloj.GetUtcNow().UtcDateTime, ct)
                : null;

            var archivo = publicacion?.Elementos
                .Select(e => e.ArchivoMultimedia)
                .FirstOrDefault(a => a.Id == archivoMultimediaId)
                ?? throw new ExcepcionNoEncontrado("el archivo multimedia", archivoMultimediaId);

            var contenido = await _almacenamiento.AbrirLecturaAsync(archivo.ClaveAlmacenamiento, ct);
            return new ContenidoArchivoDto(contenido, archivo.TipoMime, archivo.HashSha256);
        }

        /// <summary>
        /// Registra que el reproductor está activo y qué versión tiene realmente cargada.
        /// </summary>
        public async Task RegistrarLatidoAsync(string token, LatidoDto dto, CancellationToken ct = default)
        {
            var pantalla = await AutenticarAsync(token, ct);
            pantalla.Estado ??= new EstadoPantalla { PantallaId = pantalla.Id };
            pantalla.Estado.UltimaConexionUtc = _reloj.GetUtcNow().UtcDateTime;
            pantalla.Estado.UltimaVersionReportada = dto.VersionReportada.Recortar(LongitudesMaximas.VersionReportada);
            pantalla.Estado.UltimoError = dto.Error.Recortar(LongitudesMaximas.DetalleError);
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
        }

        private async Task<Pantalla> AutenticarAsync(string token, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new ExcepcionNoAutorizado("Falta el token del dispositivo.");
            }

            return await _pantallas.ObtenerPorTokenHashAsync(TokensDispositivo.CalcularHash(token), ct)
                ?? throw new ExcepcionNoAutorizado("Token de dispositivo no válido.");
        }

        /// <summary>
        /// Elige la asignación de mayor prioridad que esté activa ahora (vigencia y horario) y tenga una versión publicada.
        /// </summary>
        private async Task<PublicacionLista?> ResolverPublicacionAsync(Pantalla pantalla, DateTime ahoraUtc, CancellationToken ct)
        {
            var sucursalId = pantalla.GrupoPantalla.SucursalId;
            var gruposPorId = (await _grupos.ListarAsync(sucursalId, ct)).ToDictionary(g => g.Id);
            var cadenaGrupos = JerarquiaGrupos.ObtenerCadena(pantalla.GrupoPantallaId, gruposPorId);

            var asignaciones = await _asignaciones.ListarHabilitadasParaDestinosAsync(pantalla.Id, cadenaGrupos, sucursalId, ct);
            foreach (var asignacion in ResolutorAsignaciones.ObtenerCandidatas(asignaciones, pantalla.Id, sucursalId, cadenaGrupos, ahoraUtc))
            {
                var publicacion = await _publicaciones.ObtenerUltimaPublicadaAsync(asignacion.ListaReproduccionId, ct);
                if (publicacion is not null)
                {
                    return publicacion;
                }
            }

            return null;
        }
    }
}
