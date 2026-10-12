using System.Globalization;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;

namespace EDEEste.AdPlay.Infrastructure.Servicios
{
    /// <summary>
    /// Genera el ZIP de una publicación: manifest.json, version.txt y los medios.
    /// Verifica el hash de cada medio al empaquetarlo y el del paquete tras guardarlo.
    /// </summary>
    public class GeneradorPaquetesZip : IGeneradorPaquetes
    {
        private const int TamanoBufer = 81920;

        private static readonly JsonSerializerOptions OpcionesJson = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = true,
            Converters = { new JsonStringEnumConverter() }
        };

        private readonly IAlmacenamientoMultimedia _almacenamiento;

        public GeneradorPaquetesZip(IAlmacenamientoMultimedia almacenamiento)
        {
            _almacenamiento = almacenamiento;
        }

        public async Task<PaqueteGenerado> GenerarAsync(
            ManifiestoDto manifiesto,
            IReadOnlyList<ArchivoPaquete> archivos,
            string claveDestino,
            CancellationToken ct = default)
        {
            var temporal = Path.Combine(Path.GetTempPath(), $"adplay-{Guid.NewGuid():N}.zip");
            try
            {
                await using (var flujoZip = new FileStream(temporal, FileMode.CreateNew, FileAccess.ReadWrite))
                await using (var zip = new ZipArchive(flujoZip, ZipArchiveMode.Create))
                {
                    foreach (var archivo in archivos)
                    {
                        await AgregarMedioAsync(zip, archivo, ct);
                    }

                    await AgregarTextoAsync(zip, FormatoPaquete.NombreManifiesto, JsonSerializer.Serialize(manifiesto, OpcionesJson), ct);
                    await AgregarTextoAsync(zip, FormatoPaquete.NombreVersion, ConstruirVersionTxt(manifiesto), ct);
                }

                string hashLocal;
                await using (var lectura = File.OpenRead(temporal))
                {
                    hashLocal = Convert.ToHexStringLower(await SHA256.HashDataAsync(lectura, ct));
                }

                ResultadoAlmacenamiento guardado;
                await using (var lectura = File.OpenRead(temporal))
                {
                    guardado = await _almacenamiento.GuardarAsync(claveDestino, lectura, ct);
                }

                if (guardado.HashSha256 != hashLocal)
                {
                    await _almacenamiento.EliminarAsync(claveDestino, CancellationToken.None);
                    throw new InvalidDataException("El paquete guardado no coincide con el hash calculado al generarlo.");
                }

                return new PaqueteGenerado(guardado.TamanoBytes, guardado.HashSha256);
            }
            finally
            {
                if (File.Exists(temporal))
                {
                    File.Delete(temporal);
                }
            }
        }

        private async Task AgregarMedioAsync(ZipArchive zip, ArchivoPaquete archivo, CancellationToken ct)
        {
            // Imágenes y vídeos ya están comprimidos: se almacenan sin volver a comprimir.
            var entrada = zip.CreateEntry(archivo.RutaEnPaquete, CompressionLevel.NoCompression);
            using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
            await using (var origen = await _almacenamiento.AbrirLecturaAsync(archivo.ClaveAlmacenamiento, ct))
            await using (var destino = await entrada.OpenAsync(ct))
            {
                var bufer = new byte[TamanoBufer];
                int leidos;
                while ((leidos = await origen.ReadAsync(bufer, ct)) > 0)
                {
                    hash.AppendData(bufer, 0, leidos);
                    await destino.WriteAsync(bufer.AsMemory(0, leidos), ct);
                }
            }

            var calculado = Convert.ToHexStringLower(hash.GetHashAndReset());
            if (!string.Equals(calculado, archivo.HashSha256, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidDataException($"El medio '{archivo.RutaEnPaquete}' no coincide con su hash registrado; puede estar dañado.");
            }
        }

        private static async Task AgregarTextoAsync(ZipArchive zip, string nombre, string contenido, CancellationToken ct)
        {
            var entrada = zip.CreateEntry(nombre, CompressionLevel.Optimal);
            await using var destino = await entrada.OpenAsync(ct);
            await destino.WriteAsync(new UTF8Encoding(encoderShouldEmitUTF8Identifier: false).GetBytes(contenido), ct);
        }

        private static string ConstruirVersionTxt(ManifiestoDto manifiesto)
        {
            var texto = new StringBuilder();
            texto.AppendLine("EDEEste.AdPlay - Paquete de reproducción local");
            texto.AppendLine(CultureInfo.InvariantCulture, $"Lista: {manifiesto.NombreLista}");
            texto.AppendLine(CultureInfo.InvariantCulture, $"Versión: {manifiesto.NumeroVersion} (publicación {manifiesto.PublicacionId}, id {manifiesto.Version})");
            texto.AppendLine(CultureInfo.InvariantCulture, $"Generado (UTC): {manifiesto.GeneradoUtc:yyyy-MM-dd HH:mm:ss}");
            texto.AppendLine(CultureInfo.InvariantCulture, $"Elementos: {manifiesto.Elementos.Count}");
            texto.AppendLine(CultureInfo.InvariantCulture, $"El orden, la duración y el hash SHA-256 de cada archivo están en {FormatoPaquete.NombreManifiesto}.");
            return texto.ToString();
        }
    }
}
