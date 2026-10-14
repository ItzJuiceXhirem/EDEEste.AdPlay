using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Domain.Services;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.Application.CasosDeUso.Reportes
{
    /// <summary>
    /// Reportes operativos: qué debería reproducir cada pantalla frente a lo que informó haber cargado.
    /// </summary>
    public class ServicioReportes
    {
        private readonly IRepositorioPantallas _pantallas;
        private readonly IRepositorioGruposPantallas _grupos;
        private readonly IRepositorioAsignaciones _asignaciones;
        private readonly IRepositorioPublicaciones _publicaciones;
        private readonly TimeProvider _reloj;
        private readonly OpcionesReproductor _opciones;

        public ServicioReportes(
            IRepositorioPantallas pantallas,
            IRepositorioGruposPantallas grupos,
            IRepositorioAsignaciones asignaciones,
            IRepositorioPublicaciones publicaciones,
            TimeProvider reloj,
            IOptions<OpcionesReproductor> opciones)
        {
            _pantallas = pantallas;
            _grupos = grupos;
            _asignaciones = asignaciones;
            _publicaciones = publicaciones;
            _reloj = reloj;
            _opciones = opciones.Value;
        }

        public async Task<IReadOnlyList<EstadoPantallaReporteDto>> EstadoPantallasAsync(CancellationToken ct = default)
        {
            var ahora = _reloj.GetUtcNow().UtcDateTime;

            // Se carga todo una vez y se resuelve en memoria: el reporte cubre todas las pantallas.
            var pantallas = await _pantallas.ListarAsync(null, null, ct);
            var gruposPorId = (await _grupos.ListarAsync(null, ct)).ToDictionary(g => g.Id);
            var asignaciones = await _asignaciones.ListarHabilitadasAsync(ct);
            var ultimasPorLista = (await _publicaciones
                    .ListarUltimasPublicadasAsync(asignaciones.Select(a => a.ListaReproduccionId).Distinct(), ct))
                .ToDictionary(p => p.ListaReproduccionId);

            var esperadas = pantallas.ToDictionary(
                p => p.Id,
                p => p.EstaHabilitada ? ResolverEsperada(p, gruposPorId, asignaciones, ultimasPorLista, ahora) : null);

            var idsEsperadas = esperadas.Values.OfType<PublicacionLista>().Select(p => p.Id).Distinct();
            var elementosPorPublicacion = (await _publicaciones.ListarElementosAsync(idsEsperadas, ct))
                .GroupBy(e => e.PublicacionListaId)
                .ToDictionary(
                    g => g.Key,
                    g => (IReadOnlyList<ElementoReproduccionDto>)g
                        .OrderBy(e => e.Posicion)
                        .Select(e => new ElementoReproduccionDto(
                            e.Posicion,
                            e.AnuncioId,
                            e.Anuncio.Titulo,
                            e.ArchivoMultimediaId,
                            e.ArchivoMultimedia.TipoMultimedia,
                            e.DuracionSegundos))
                        .ToList());

            return pantallas
                .Select(p => ConstruirFila(p, esperadas[p.Id], elementosPorPublicacion, ahora))
                .ToList();
        }

        private EstadoPantallaReporteDto ConstruirFila(
            Pantalla pantalla,
            PublicacionLista? esperada,
            IReadOnlyDictionary<int, IReadOnlyList<ElementoReproduccionDto>> elementosPorPublicacion,
            DateTime ahoraUtc)
        {
            var estadoOperativo = pantalla.CalcularEstadoOperativo(ahoraUtc, _opciones.VentanaDesconexion);
            var reportada = pantalla.Estado?.UltimaVersionReportada;

            // Solo el reproductor web informa su versión; en modo local el servidor no puede saberlo.
            bool? actualizada = pantalla.ModoReproduccion == ModoReproduccion.NavegadorWeb
                && estadoOperativo != EstadoOperativoPantalla.SinDatos
                && esperada is not null
                    ? reportada == esperada.IdentificadorVersion
                    : null;

            // La posición informada solo tiene sentido sobre los elementos de la versión que realmente está mostrando.
            var estado = pantalla.Estado;
            var reproduccion = estadoOperativo == EstadoOperativoPantalla.EnLinea && actualizada == true
                && estado is { PosicionReproduccion: { } posicion, AnuncioReproduccionId: { } anuncioId, SegundoReproduccion: { } segundo }
                    ? new ReproduccionReportadaDto(posicion, anuncioId, segundo, estado.UltimaConexionUtc)
                    : null;

            return new EstadoPantallaReporteDto(
                pantalla.Id,
                pantalla.CodigoPantalla,
                pantalla.Nombre,
                pantalla.GrupoPantalla.SucursalId,
                pantalla.GrupoPantalla.Sucursal.Nombre,
                pantalla.GrupoPantallaId,
                pantalla.GrupoPantalla.Nombre,
                pantalla.ModoReproduccion,
                pantalla.EstaHabilitada,
                estadoOperativo,
                pantalla.Estado?.UltimaConexionUtc,
                esperada?.ListaReproduccion.Nombre,
                esperada?.IdentificadorVersion,
                reportada,
                actualizada,
                pantalla.Estado?.UltimoError,
                esperada?.NumeroVersion,
                esperada is null ? [] : elementosPorPublicacion.GetValueOrDefault(esperada.Id) ?? [],
                reproduccion);
        }

        private static PublicacionLista? ResolverEsperada(
            Pantalla pantalla,
            IReadOnlyDictionary<int, GrupoPantalla> gruposPorId,
            IReadOnlyList<AsignacionLista> asignaciones,
            IReadOnlyDictionary<int, PublicacionLista> ultimasPorLista,
            DateTime ahoraUtc)
        {
            var cadenaGrupos = JerarquiaGrupos.ObtenerCadena(pantalla.GrupoPantallaId, gruposPorId);
            return ResolutorAsignaciones
                .ObtenerCandidatas(asignaciones, pantalla.Id, pantalla.GrupoPantalla.SucursalId, cadenaGrupos, ahoraUtc)
                .Select(a => ultimasPorLista.GetValueOrDefault(a.ListaReproduccionId))
                .FirstOrDefault(publicacion => publicacion is not null);
        }
    }
}
