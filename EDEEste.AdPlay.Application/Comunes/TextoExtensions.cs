namespace EDEEste.AdPlay.Application.Comunes
{
    public static class TextoExtensions
    {
        /// <summary>Los códigos de negocio (sucursal, pantalla) se guardan sin espacios y en mayúsculas.</summary>
        public static string NormalizarCodigo(this string valor) => valor.Trim().ToUpperInvariant();

        /// <summary>Recorta el texto y devuelve null si queda vacío.</summary>
        public static string? ANuloSiVacio(this string? valor) =>
            string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

        public static string? Recortar(this string? valor, int longitudMaxima)
        {
            var limpio = valor.ANuloSiVacio();
            return limpio is null || limpio.Length <= longitudMaxima ? limpio : limpio[..longitudMaxima];
        }
    }
}
