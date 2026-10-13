namespace EDEEste.AdPlay.Application.Contratos.Servicios
{
    public sealed record ResultadoAlmacenamiento(long TamanoBytes, string HashSha256);

    /// <summary>
    /// Almacenamiento físico de medios y paquetes fuera de SQL Server. Las claves las genera el sistema.
    /// </summary>
    public interface IAlmacenamientoMultimedia
    {
        /// <summary>Guarda el contenido bajo la clave indicada y devuelve su tamaño y hash SHA-256.</summary>
        Task<ResultadoAlmacenamiento> GuardarAsync(string clave, Stream contenido, CancellationToken ct = default);

        Task<Stream> AbrirLecturaAsync(string clave, CancellationToken ct = default);
        Task<bool> ExisteAsync(string clave, CancellationToken ct = default);
        Task EliminarAsync(string clave, CancellationToken ct = default);
    }
}
