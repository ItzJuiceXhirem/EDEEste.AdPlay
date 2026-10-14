using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;

namespace EDEEste.AdPlay.Application.CasosDeUso.Historial
{
    /// <summary>
    /// Consulta transversal de publicaciones y exportaciones de todas las listas, con quién las realizó.
    /// </summary>
    public class ServicioHistorial
    {
        private readonly IRepositorioPublicaciones _publicaciones;
        private readonly IRepositorioExportaciones _exportaciones;
        private readonly IGestorUsuarios _gestorUsuarios;

        public ServicioHistorial(
            IRepositorioPublicaciones publicaciones,
            IRepositorioExportaciones exportaciones,
            IGestorUsuarios gestorUsuarios)
        {
            _publicaciones = publicaciones;
            _exportaciones = exportaciones;
            _gestorUsuarios = gestorUsuarios;
        }

        public async Task<PaginaDto<HistorialPublicacionDto>> ListarPublicacionesAsync(
            FiltroHistorial filtro, int? pagina, int? tamanoPagina, CancellationToken ct = default)
        {
            var (paginaActual, tamano) = Paginacion.Normalizar(pagina, tamanoPagina);
            var (publicaciones, total) = await _publicaciones.ListarHistorialAsync(filtro, paginaActual, tamano, ct);
            var nombres = await ObtenerNombresAsync(publicaciones.Select(p => p.UsuarioPublicadorId), ct);

            var elementos = publicaciones
                .Select(p => new HistorialPublicacionDto(
                    p.Id,
                    p.ListaReproduccionId,
                    p.ListaReproduccion.Nombre,
                    p.NumeroVersion,
                    p.IdentificadorVersion,
                    p.FechaPublicacionUtc,
                    p.EstadoPublicacion,
                    p.Elementos.Count,
                    NombreDe(nombres, p.UsuarioPublicadorId)))
                .ToList();
            return new PaginaDto<HistorialPublicacionDto>(elementos, total, paginaActual, tamano);
        }

        public async Task<PaginaDto<HistorialExportacionDto>> ListarExportacionesAsync(
            FiltroHistorial filtro, int? pagina, int? tamanoPagina, CancellationToken ct = default)
        {
            var (paginaActual, tamano) = Paginacion.Normalizar(pagina, tamanoPagina);
            var (exportaciones, total) = await _exportaciones.ListarHistorialAsync(filtro, paginaActual, tamano, ct);
            var nombres = await ObtenerNombresAsync(exportaciones.Select(e => e.UsuarioSolicitanteId), ct);

            var elementos = exportaciones
                .Select(e => new HistorialExportacionDto(
                    e.Id,
                    e.PublicacionListaId,
                    e.PublicacionLista.ListaReproduccion.Nombre,
                    e.PublicacionLista.NumeroVersion,
                    e.EstadoExportacion,
                    e.TamanoBytes,
                    e.HashPaquete,
                    e.FechaSolicitudUtc,
                    e.FechaFinalizacionUtc,
                    NombreDe(nombres, e.UsuarioSolicitanteId),
                    e.DetalleError))
                .ToList();
            return new PaginaDto<HistorialExportacionDto>(elementos, total, paginaActual, tamano);
        }

        public async Task<ResumenHistorialDto> ResumirAsync(FiltroHistorial filtro, CancellationToken ct = default)
        {
            var publicaciones = await _publicaciones.ResumirHistorialAsync(filtro, ct);
            var exportaciones = await _exportaciones.ResumirHistorialAsync(filtro, ct);
            return new ResumenHistorialDto(
                publicaciones.Total,
                publicaciones.Retiradas,
                publicaciones.Ultima?.FechaPublicacionUtc,
                publicaciones.Ultima?.ListaReproduccion.Nombre,
                publicaciones.Ultima?.NumeroVersion,
                exportaciones.Total,
                exportaciones.Completadas,
                exportaciones.BytesCompletadas);
        }

        private Task<IReadOnlyDictionary<int, string>> ObtenerNombresAsync(IEnumerable<int?> ids, CancellationToken ct) =>
            _gestorUsuarios.ObtenerNombresAsync(ids.Where(i => i.HasValue).Select(i => i!.Value).Distinct(), ct);

        private static string? NombreDe(IReadOnlyDictionary<int, string> nombres, int? usuarioId) =>
            usuarioId.HasValue ? nombres.GetValueOrDefault(usuarioId.Value) : null;
    }
}
