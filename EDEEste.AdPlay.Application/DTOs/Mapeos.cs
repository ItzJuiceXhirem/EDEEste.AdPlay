using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    /// <summary>
    /// Conversión de entidades a DTO. Los endpoints nunca exponen entidades directamente.
    /// </summary>
    public static class Mapeos
    {
        public static SucursalDto ADto(this Sucursal s) =>
            new(s.Id, s.Codigo, s.Nombre, s.ZonaHorariaId, s.EstaActiva, s.FechaCreacionUtc);

        public static GrupoPantallaDto ADto(this GrupoPantalla g) =>
            new(g.Id, g.SucursalId, g.Sucursal.Nombre, g.GrupoPadreId, g.Nombre, g.EstaActivo);

        public static PantallaDto ADto(this Pantalla p, EstadoOperativoPantalla estadoOperativo) =>
            new(
                p.Id,
                p.CodigoPantalla,
                p.Nombre,
                p.Modelo,
                p.NumeroSerie,
                p.GrupoPantallaId,
                p.GrupoPantalla.Nombre,
                p.GrupoPantalla.SucursalId,
                p.GrupoPantalla.Sucursal.Nombre,
                p.ModoReproduccion,
                p.EstaHabilitada,
                p.FechaCreacionUtc,
                p.TokenDispositivoHash is not null,
                estadoOperativo,
                p.Estado?.UltimaConexionUtc,
                p.Estado?.UltimaVersionReportada,
                p.Estado?.UltimoError);

        public static ArchivoMultimediaDto ADto(this ArchivoMultimedia a) =>
            new(
                a.Id,
                a.NombreOriginal,
                a.TipoMultimedia,
                a.TipoMime,
                a.TamanoBytes,
                a.HashSha256,
                a.Ancho,
                a.Alto,
                a.DuracionSegundos,
                a.FechaCargaUtc,
                a.EstaArchivado);

        public static AnuncioDto ADto(this Anuncio a) =>
            new(
                a.Id,
                a.Titulo,
                a.Descripcion,
                a.ArchivoMultimediaId,
                a.ArchivoMultimedia.NombreOriginal,
                a.ArchivoMultimedia.TipoMultimedia,
                a.DuracionPredeterminadaSegundos,
                a.EstaActivo,
                a.FechaCreacionUtc);

        public static ListaReproduccionResumenDto AResumenDto(this ListaReproduccion l) =>
            new(l.Id, l.Nombre, l.Descripcion, l.EstaActiva, l.Elementos.Count, l.FechaCreacionUtc, l.FechaActualizacionUtc);

        public static ListaReproduccionDto ADto(this ListaReproduccion l) =>
            new(
                l.Id,
                l.Nombre,
                l.Descripcion,
                l.EstaActiva,
                l.FechaCreacionUtc,
                l.FechaActualizacionUtc,
                l.Elementos
                    .OrderBy(e => e.Posicion)
                    .Select(e => new ElementoListaDto(
                        e.Id,
                        e.Posicion,
                        e.AnuncioId,
                        e.Anuncio.Titulo,
                        e.Anuncio.ArchivoMultimediaId,
                        e.Anuncio.ArchivoMultimedia.TipoMultimedia,
                        e.DuracionPersonalizadaSegundos,
                        e.DuracionEfectivaSegundos))
                    .ToList());

        public static AsignacionListaDto ADto(this AsignacionLista a, DateTime ahoraUtc) =>
            new(
                a.Id,
                a.ListaReproduccionId,
                a.ListaReproduccion.Nombre,
                a.Nivel,
                a.SucursalId,
                a.GrupoPantallaId,
                a.PantallaId,
                a.Pantalla?.Nombre ?? a.GrupoPantalla?.Nombre ?? a.Sucursal?.Nombre ?? string.Empty,
                a.EstaHabilitada,
                a.FechaInicioUtc,
                a.FechaFinUtc,
                a.FechaCreacionUtc,
                a.EstaActivaEn(ahoraUtc),
                a.ReglasHorario.OrderBy(r => r.Id).Select(r => r.ADto()).ToList());

        public static ReglaHorarioDto ADto(this ReglaHorario r) =>
            new(r.Id, DiasIndividuales(r.DiasSemana), r.HoraInicio, r.HoraFin, r.ZonaHorariaId, r.EstaActiva);

        /// <summary>Descompone una combinación de banderas en los días que la forman.</summary>
        private static IReadOnlyList<DiasSemana> DiasIndividuales(DiasSemana dias) =>
            Enum.GetValues<DiasSemana>()
                .Where(d => d is not (DiasSemana.Ninguno or DiasSemana.Todos) && dias.HasFlag(d))
                .ToList();

        public static PublicacionListaDto ADto(this PublicacionLista p) =>
            new(
                p.Id,
                p.ListaReproduccionId,
                p.ListaReproduccion.Nombre,
                p.NumeroVersion,
                p.IdentificadorVersion,
                p.FechaPublicacionUtc,
                p.EstadoPublicacion,
                p.Elementos
                    .OrderBy(e => e.Posicion)
                    .Select(e => new ElementoPublicacionDto(
                        e.Posicion,
                        e.AnuncioId,
                        e.ArchivoMultimediaId,
                        e.NombreArchivoPublicado,
                        e.DuracionSegundos,
                        e.HashSha256))
                    .ToList());

        public static ExportacionDto ADto(this Exportacion e) =>
            new(
                e.Id,
                e.PublicacionListaId,
                e.EstadoExportacion,
                e.HashPaquete,
                e.TamanoBytes,
                e.FechaSolicitudUtc,
                e.FechaFinalizacionUtc,
                e.DetalleError);
    }
}
