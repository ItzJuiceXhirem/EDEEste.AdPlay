using EDEEste.AdPlay.Application.Comunes;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.CasosDeUso.ListasReproduccion
{
    public class ServicioListasReproduccion
    {
        private readonly IRepositorioListas _listas;
        private readonly IRepositorioAnuncios _anuncios;
        private readonly IRepositorioPublicaciones _publicaciones;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUsuarioActual _usuarioActual;
        private readonly TimeProvider _reloj;

        public ServicioListasReproduccion(
            IRepositorioListas listas,
            IRepositorioAnuncios anuncios,
            IRepositorioPublicaciones publicaciones,
            IUnidadDeTrabajo unidadDeTrabajo,
            IRegistroAuditoria auditoria,
            IUsuarioActual usuarioActual,
            TimeProvider reloj)
        {
            _listas = listas;
            _anuncios = anuncios;
            _publicaciones = publicaciones;
            _unidadDeTrabajo = unidadDeTrabajo;
            _auditoria = auditoria;
            _usuarioActual = usuarioActual;
            _reloj = reloj;
        }

        public async Task<IReadOnlyList<ListaReproduccionResumenDto>> ListarAsync(CancellationToken ct = default)
        {
            var listas = await _listas.ListarAsync(ct);
            var versiones = (await _publicaciones.ListarUltimasPublicadasAsync(listas.Select(l => l.Id), ct))
                .ToDictionary(p => p.ListaReproduccionId, p => p.NumeroVersion);
            return listas.Select(l => l.AResumenDto(versiones.TryGetValue(l.Id, out var v) ? v : null)).ToList();
        }

        public async Task<ListaReproduccionDto> ObtenerAsync(int id, CancellationToken ct = default) =>
            (await ObtenerEntidadAsync(id, ct)).ADto();

        public async Task<ListaReproduccionDto> CrearAsync(GuardarListaReproduccionDto dto, CancellationToken ct = default)
        {
            ValidadorListasReproduccion.Validar(dto);
            var lista = new ListaReproduccion
            {
                FechaCreacionUtc = _reloj.GetUtcNow().UtcDateTime,
                UsuarioCreadorId = _usuarioActual.Id
            };
            await AplicarAsync(lista, dto, ct);

            _listas.Agregar(lista);
            _auditoria.Registrar(AccionAuditoria.Crear, lista, $"Lista '{lista.Nombre}' con {lista.Elementos.Count} anuncios");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return lista.ADto();
        }

        /// <summary>
        /// Reemplaza datos y elementos de la lista. Las versiones ya publicadas no cambian.
        /// </summary>
        public async Task<ListaReproduccionDto> ActualizarAsync(int id, GuardarListaReproduccionDto dto, CancellationToken ct = default)
        {
            ValidadorListasReproduccion.Validar(dto);
            var lista = await ObtenerEntidadAsync(id, ct);
            var estabaActiva = lista.EstaActiva;
            await AplicarAsync(lista, dto, ct);

            _auditoria.Registrar(
                AuditoriaExtensions.AccionDeEdicion(estabaActiva, lista.EstaActiva),
                lista,
                $"Lista '{lista.Nombre}' con {lista.Elementos.Count} anuncios");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return lista.ADto();
        }

        private async Task AplicarAsync(ListaReproduccion lista, GuardarListaReproduccionDto dto, CancellationToken ct)
        {
            var elementos = dto.Elementos ?? [];
            var idsSolicitados = elementos.Select(e => e.AnuncioId).Distinct().ToList();
            var anuncios = (await _anuncios.ObtenerVariosAsync(idsSolicitados, ct)).ToDictionary(a => a.Id);

            var faltantes = idsSolicitados.Where(id => !anuncios.ContainsKey(id)).ToList();
            if (faltantes.Count > 0)
            {
                throw new ExcepcionValidacion(nameof(dto.Elementos), $"No existen los anuncios: {string.Join(", ", faltantes)}.");
            }

            lista.Nombre = dto.Nombre.Trim();
            lista.Descripcion = dto.Descripcion.ANuloSiVacio();
            lista.EstaActiva = dto.EstaActiva;
            lista.ReemplazarElementos(
                elementos.Select(e => (e.AnuncioId, e.DuracionPersonalizadaSegundos)),
                _reloj.GetUtcNow().UtcDateTime);

            foreach (var elemento in lista.Elementos)
            {
                elemento.Anuncio = anuncios[elemento.AnuncioId];
            }
        }

        private async Task<ListaReproduccion> ObtenerEntidadAsync(int id, CancellationToken ct) =>
            await _listas.ObtenerConElementosAsync(id, ct) ?? throw new ExcepcionNoEncontrado("la lista de reproducción", id);
    }
}
