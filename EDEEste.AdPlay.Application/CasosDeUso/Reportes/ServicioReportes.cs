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

            return pantallas
                .Select(p => ConstruirFila(p, gruposPorId, asignaciones, ultimasPorLista, ahora))
                .ToList();
        }

        private EstadoPantallaReporteDto ConstruirFila(
            Pantalla pantalla,
            IReadOnlyDictionary<int, GrupoPantalla> gruposPorId,
            IReadOnlyList<AsignacionLista> asignaciones,
            IReadOnlyDictionary<int, PublicacionLista> ultimasPorLista,
            DateTime ahoraUtc)
        {
            var estadoOperativo = pantalla.CalcularEstadoOperativo(ahoraUtc, _opciones.VentanaDesconexion);
            var esperada = pantalla.EstaHabilitada
                ? ResolverEsperada(pantalla, gruposPorId, asignaciones, ultimasPorLista, ahoraUtc)
                : null;
            var reportada = pantalla.Estado?.UltimaVersionReportada;

            // Solo el reproductor web informa su versión; en modo local el servidor no puede saberlo.
            bool? actualizada = pantalla.ModoReproduccion == ModoReproduccion.NavegadorWeb
                && estadoOperativo != EstadoOperativoPantalla.SinDatos
                && esperada is not null
                    ? reportada == esperada.IdentificadorVersion
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
                pantalla.Estado?.UltimoError);
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
