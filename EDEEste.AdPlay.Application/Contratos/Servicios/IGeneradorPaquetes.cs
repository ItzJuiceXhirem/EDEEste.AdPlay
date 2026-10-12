using EDEEste.AdPlay.Application.DTOs;

namespace EDEEste.AdPlay.Application.Contratos.Servicios
{
    /// <param name="RutaEnPaquete">Ruta relativa dentro del ZIP (por ejemplo, medios/001_ab12cd.jpg).</param>
    /// <param name="ClaveAlmacenamiento">Clave del medio en el almacenamiento.</param>
    /// <param name="HashSha256">Hash esperado; el paquete se rechaza si el contenido no coincide.</param>
    public sealed record ArchivoPaquete(string RutaEnPaquete, string ClaveAlmacenamiento, string HashSha256);

    public sealed record PaqueteGenerado(long TamanoBytes, string HashSha256);

    /// <summary>
    /// Construye un paquete ZIP (manifest.json, medios y version.txt) a partir de una publicación.
    /// </summary>
    public interface IGeneradorPaquetes
    {
        Task<PaqueteGenerado> GenerarAsync(
            ManifiestoDto manifiesto,
            IReadOnlyList<ArchivoPaquete> archivos,
            string claveDestino,
            CancellationToken ct = default);
    }
}
