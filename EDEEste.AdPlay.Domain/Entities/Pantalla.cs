using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Televisor o reproductor. Su sucursal se obtiene a través de su grupo; no se duplica SucursalId.
    /// </summary>
    public class Pantalla : EntidadBase
    {
        public string CodigoPantalla { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string? Modelo { get; set; }
        public string? NumeroSerie { get; set; }
        public int GrupoPantallaId { get; set; }
        public ModoReproduccion ModoReproduccion { get; set; } = ModoReproduccion.NavegadorWeb;

        /// <summary>Decisión administrativa; independiente del estado técnico (en línea/desconectada).</summary>
        public bool EstaHabilitada { get; set; } = true;

        public DateTime FechaCreacionUtc { get; set; }

        /// <summary>Hash SHA-256 del token del dispositivo. El token en claro solo se muestra al generarlo.</summary>
        public string? TokenDispositivoHash { get; set; }

        public GrupoPantalla GrupoPantalla { get; set; } = null!;
        public EstadoPantalla? Estado { get; set; }

        /// <param name="ventanaDesconexion">Tiempo sin latido tras el cual la pantalla se considera desconectada.</param>
        public EstadoOperativoPantalla CalcularEstadoOperativo(DateTime ahoraUtc, TimeSpan ventanaDesconexion)
        {
            if (Estado is null)
            {
                return EstadoOperativoPantalla.SinDatos;
            }

            return ahoraUtc - Estado.UltimaConexionUtc <= ventanaDesconexion
                ? EstadoOperativoPantalla.EnLinea
                : EstadoOperativoPantalla.Desconectada;
        }
    }
}
