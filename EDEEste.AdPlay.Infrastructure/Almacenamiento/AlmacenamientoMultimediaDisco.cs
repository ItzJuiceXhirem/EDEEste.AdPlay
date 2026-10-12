using System.Security.Cryptography;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.Infrastructure.Almacenamiento
{
    /// <summary>
    /// Guarda archivos en disco o en un recurso de red bajo una ruta raíz controlada.
    /// Los archivos son inmutables: nunca se sobrescribe una clave existente.
    /// </summary>
    public class AlmacenamientoMultimediaDisco : IAlmacenamientoMultimedia
    {
        private const int TamanoBufer = 81920;

        // Windows no distingue mayúsculas en rutas; en Linux sí, y ahí una comparación insensible permitiría salir de la raíz.
        private static readonly StringComparison ComparacionRutas =
            OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        private readonly string _raiz;

        public AlmacenamientoMultimediaDisco(IOptions<OpcionesAlmacenamiento> opciones)
        {
            if (string.IsNullOrWhiteSpace(opciones.Value.RutaRaiz))
            {
                throw new InvalidOperationException($"Configure '{OpcionesAlmacenamiento.Seccion}:RutaRaiz'.");
            }

            _raiz = Path.GetFullPath(opciones.Value.RutaRaiz);
            Directory.CreateDirectory(_raiz);
        }

        public async Task<ResultadoAlmacenamiento> GuardarAsync(string clave, Stream contenido, CancellationToken ct = default)
        {
            var destino = ResolverRuta(clave);
            if (File.Exists(destino))
            {
                throw new IOException($"Ya existe un archivo con la clave '{clave}'.");
            }

            Directory.CreateDirectory(Path.GetDirectoryName(destino)!);
            var temporal = destino + ".tmp-" + Guid.NewGuid().ToString("N");
            try
            {
                long total = 0;
                using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
                await using (var salida = new FileStream(temporal, FileMode.CreateNew, FileAccess.Write, FileShare.None, TamanoBufer, useAsync: true))
                {
                    var bufer = new byte[TamanoBufer];
                    int leidos;
                    while ((leidos = await contenido.ReadAsync(bufer, ct)) > 0)
                    {
                        hash.AppendData(bufer, 0, leidos);
                        await salida.WriteAsync(bufer.AsMemory(0, leidos), ct);
                        total += leidos;
                    }
                }

                File.Move(temporal, destino);
                return new ResultadoAlmacenamiento(total, Convert.ToHexStringLower(hash.GetHashAndReset()));
            }
            finally
            {
                if (File.Exists(temporal))
                {
                    File.Delete(temporal);
                }
            }
        }

        public Task<Stream> AbrirLecturaAsync(string clave, CancellationToken ct = default)
        {
            var ruta = ResolverRuta(clave);
            if (!File.Exists(ruta))
            {
                throw new FileNotFoundException($"No se encontró el archivo con la clave '{clave}'.");
            }

            Stream flujo = new FileStream(ruta, FileMode.Open, FileAccess.Read, FileShare.Read, TamanoBufer, useAsync: true);
            return Task.FromResult(flujo);
        }

        public Task<bool> ExisteAsync(string clave, CancellationToken ct = default) =>
            Task.FromResult(File.Exists(ResolverRuta(clave)));

        public Task EliminarAsync(string clave, CancellationToken ct = default)
        {
            var ruta = ResolverRuta(clave);
            if (File.Exists(ruta))
            {
                File.Delete(ruta);
            }

            return Task.CompletedTask;
        }

        /// <summary>Convierte la clave en ruta absoluta impidiendo salir de la raíz (por ejemplo, con "..").</summary>
        private string ResolverRuta(string clave)
        {
            if (string.IsNullOrWhiteSpace(clave) || Path.IsPathRooted(clave))
            {
                throw new ArgumentException("Clave de almacenamiento no válida.", nameof(clave));
            }

            var ruta = Path.GetFullPath(Path.Combine(_raiz, clave));
            if (!ruta.StartsWith(_raiz + Path.DirectorySeparatorChar, ComparacionRutas))
            {
                throw new ArgumentException("Clave de almacenamiento no válida.", nameof(clave));
            }

            return ruta;
        }
    }
}
