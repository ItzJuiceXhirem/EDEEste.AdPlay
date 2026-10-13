using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.CasosDeUso.Publicaciones
{
    public class ServicioPublicaciones
    {
        /// <summary>Caracteres del hash incluidos en el nombre publicado: distingue versiones del mismo medio.</summary>
        private const int LongitudPrefijoHash = 12;

        private readonly IRepositorioPublicaciones _publicaciones;
        private readonly IRepositorioListas _listas;
        private readonly IAlmacenamientoMultimedia _almacenamiento;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUsuarioActual _usuarioActual;
        private readonly TimeProvider _reloj;

        public ServicioPublicaciones(
            IRepositorioPublicaciones publicaciones,
            IRepositorioListas listas,
            IAlmacenamientoMultimedia almacenamiento,
            IUnidadDeTrabajo unidadDeTrabajo,
            IRegistroAuditoria auditoria,
            IUsuarioActual usuarioActual,
            TimeProvider reloj)
        {
            _publicaciones = publicaciones;
            _listas = listas;
            _almacenamiento = almacenamiento;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
            _usuarioActual = usuarioActual;
            _reloj = reloj;
        }

        public async Task<IReadOnlyList<PublicacionListaDto>> ListarPorListaAsync(int listaReproduccionId, CancellationToken ct = default) =>
            (await _publicaciones.ListarPorListaAsync(listaReproduccionId, ct)).Select(p => p.ADto()).ToList();

        public async Task<PublicacionListaDto> ObtenerAsync(int id, CancellationToken ct = default) =>
            (await ObtenerEntidadAsync(id, ct)).ADto();

        /// <summary>
        /// Valida la lista y crea una instantánea inmutable con número de versión consecutivo.
        /// </summary>
        public async Task<PublicacionListaDto> PublicarAsync(int listaReproduccionId, CancellationToken ct = default)
        {
            var lista = await _listas.ObtenerConElementosAsync(listaReproduccionId, ct)
                ?? throw new ExcepcionNoEncontrado("la lista de reproducción", listaReproduccionId);

            await ValidarPublicableAsync(lista, ct);

            var publicacion = new PublicacionLista
            {
                ListaReproduccion = lista,
                ListaReproduccionId = lista.Id,
                NumeroVersion = await _publicaciones.ObtenerUltimoNumeroVersionAsync(lista.Id, ct) + 1,
                FechaPublicacionUtc = _reloj.GetUtcNow().UtcDateTime,
                UsuarioPublicadorId = _usuarioActual.Id,
                EstadoPublicacion = EstadoPublicacion.Publicada
            };

            foreach (var elemento in lista.Elementos.OrderBy(e => e.Posicion))
            {
                var archivo = elemento.Anuncio.ArchivoMultimedia;
                publicacion.Elementos.Add(new ElementoPublicacion
                {
                    AnuncioId = elemento.AnuncioId,
                    Anuncio = elemento.Anuncio,
                    ArchivoMultimediaId = archivo.Id,
                    ArchivoMultimedia = archivo,
                    Posicion = elemento.Posicion,
                    DuracionSegundos = elemento.DuracionEfectivaSegundos,
                    HashSha256 = archivo.HashSha256,
                    NombreArchivoPublicado = NombrarArchivoPublicado(elemento.Posicion, archivo)
                });
            }

            _publicaciones.Agregar(publicacion);
            _auditoria.Registrar(AccionAuditoria.Publicar, publicacion, $"Lista '{lista.Nombre}', versión {publicacion.NumeroVersion}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return publicacion.ADto();
        }

        /// <summary>
        /// Retira una versión: deja de entregarse a los reproductores web, que pasan a la versión publicada anterior.
        /// </summary>
        public async Task<PublicacionListaDto> RetirarAsync(int id, CancellationToken ct = default)
        {
            var publicacion = await ObtenerEntidadAsync(id, ct);
            publicacion.EstadoPublicacion = EstadoPublicacion.Retirada;
            _auditoria.Registrar(
                AccionAuditoria.Retirar,
                publicacion,
                $"Lista '{publicacion.ListaReproduccion.Nombre}', versión {publicacion.NumeroVersion}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return publicacion.ADto();
        }

        private async Task ValidarPublicableAsync(ListaReproduccion lista, CancellationToken ct)
        {
            var errores = new List<string>();
            if (!lista.EstaActiva)
            {
                errores.Add("La lista está inactiva.");
            }

            if (lista.Elementos.Count == 0)
            {
                errores.Add("La lista no tiene anuncios.");
            }

            foreach (var elemento in lista.Elementos.OrderBy(e => e.Posicion))
            {
                var anuncio = elemento.Anuncio;
                if (!anuncio.EstaActivo)
                {
                    errores.Add($"Posición {elemento.Posicion}: el anuncio '{anuncio.Titulo}' está inactivo.");
                }

                if (anuncio.ArchivoMultimedia.EstaArchivado)
                {
                    errores.Add($"Posición {elemento.Posicion}: el archivo de '{anuncio.Titulo}' está archivado.");
                }
                else if (!await _almacenamiento.ExisteAsync(anuncio.ArchivoMultimedia.ClaveAlmacenamiento, ct))
                {
                    errores.Add($"Posición {elemento.Posicion}: el archivo de '{anuncio.Titulo}' no se encuentra en el almacenamiento.");
                }
            }

            if (errores.Count > 0)
            {
                throw new ExcepcionValidacion(new Dictionary<string, string[]> { ["Publicacion"] = errores.ToArray() });
            }
        }

        /// <summary>Nombre estable por contenido: ordenado por posición y con el hash, sin usar el nombre original.</summary>
        private static string NombrarArchivoPublicado(int posicion, ArchivoMultimedia archivo) =>
            $"{posicion:D3}_{archivo.HashSha256[..LongitudPrefijoHash]}{Path.GetExtension(archivo.ClaveAlmacenamiento)}";

        private async Task<PublicacionLista> ObtenerEntidadAsync(int id, CancellationToken ct) =>
            await _publicaciones.ObtenerConElementosAsync(id, ct) ?? throw new ExcepcionNoEncontrado("la publicación", id);
    }
}
