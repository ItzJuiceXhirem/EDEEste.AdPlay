namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    /// <summary>Filtro común del historial de publicaciones y de exportaciones.</summary>
    public sealed record FiltroHistorial(int? ListaReproduccionId = null, DateTime? DesdeUtc = null, DateTime? HastaUtc = null);
}
