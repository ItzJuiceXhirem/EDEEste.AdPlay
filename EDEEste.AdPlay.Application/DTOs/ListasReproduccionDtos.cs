using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.DTOs
{
    /// <param name="DuracionTotalSegundos">Lo que dura una vuelta completa de la lista con su contenido actual.</param>
    /// <param name="UltimaVersionPublicada">Número de la versión publicada más reciente; nulo si nunca se publicó.</param>
    public sealed record ListaReproduccionResumenDto(
        int Id,
        string Nombre,
        string? Descripcion,
        bool EstaActiva,
        int CantidadElementos,
        DateTime FechaCreacionUtc,
        DateTime? FechaActualizacionUtc,
        int DuracionTotalSegundos,
        int? UltimaVersionPublicada);

    public sealed record ListaReproduccionDto(
        int Id,
        string Nombre,
        string? Descripcion,
        bool EstaActiva,
        DateTime FechaCreacionUtc,
        DateTime? FechaActualizacionUtc,
        IReadOnlyList<ElementoListaDto> Elementos);

    public sealed record ElementoListaDto(
        int Id,
        int Posicion,
        int AnuncioId,
        string TituloAnuncio,
        int ArchivoMultimediaId,
        TipoMultimedia TipoMultimedia,
        int? DuracionPersonalizadaSegundos,
        int DuracionEfectivaSegundos);

    /// <param name="Elementos">Anuncios en el orden de reproducción; la posición se asigna según el orden recibido.</param>
    public sealed record GuardarListaReproduccionDto(
        string Nombre,
        string? Descripcion,
        bool EstaActiva = true,
        IReadOnlyList<GuardarElementoListaDto>? Elementos = null);

    public sealed record GuardarElementoListaDto(int AnuncioId, int? DuracionPersonalizadaSegundos);

    public sealed record AsignacionListaDto(
        int Id,
        int ListaReproduccionId,
        string NombreLista,
        NivelAsignacion Nivel,
        int? SucursalId,
        int? GrupoPantallaId,
        int? PantallaId,
        string NombreDestino,
        bool EstaHabilitada,
        DateTime? FechaInicioUtc,
        DateTime? FechaFinUtc,
        DateTime FechaCreacionUtc,
        bool ActivaAhora,
        IReadOnlyList<ReglaHorarioDto> Horarios);

    /// <summary>Debe indicarse exactamente uno de SucursalId, GrupoPantallaId o PantallaId.</summary>
    public sealed record GuardarAsignacionDto(
        int ListaReproduccionId,
        int? SucursalId,
        int? GrupoPantallaId,
        int? PantallaId,
        bool EstaHabilitada = true,
        DateTime? FechaInicioUtc = null,
        DateTime? FechaFinUtc = null,
        IReadOnlyList<GuardarReglaHorarioDto>? Horarios = null);

    /// <param name="Dias">Cada elemento es un día (Lunes, Martes…); no se combinan banderas.</param>
    public sealed record ReglaHorarioDto(
        int Id,
        IReadOnlyList<DiasSemana> Dias,
        TimeOnly HoraInicio,
        TimeOnly HoraFin,
        string ZonaHorariaId,
        bool EstaActiva);

    /// <param name="ZonaHorariaId">Si se omite, se usa la zona horaria predeterminada de la empresa.</param>
    public sealed record GuardarReglaHorarioDto(
        IReadOnlyList<DiasSemana> Dias,
        TimeOnly HoraInicio,
        TimeOnly HoraFin,
        string? ZonaHorariaId = null,
        bool EstaActiva = true);
}
