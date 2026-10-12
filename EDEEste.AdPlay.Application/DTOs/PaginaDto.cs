namespace EDEEste.AdPlay.Application.DTOs
{
    public sealed record PaginaDto<T>(IReadOnlyList<T> Elementos, int Total, int Pagina, int TamanoPagina);

    /// <summary>
    /// Normaliza los parámetros de paginación recibidos de una consulta.
    /// </summary>
    public static class Paginacion
    {
        public const int TamanoPredeterminado = 25;
        public const int TamanoMaximo = 100;

        public static (int Pagina, int TamanoPagina) Normalizar(int? pagina, int? tamanoPagina) =>
            (Math.Max(pagina ?? 1, 1), Math.Clamp(tamanoPagina ?? TamanoPredeterminado, 1, TamanoMaximo));
    }
}
