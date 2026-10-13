using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Tests.Domain
{
    public class PantallaTests
    {
        private static readonly DateTime Ahora = new(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc);
        private static readonly TimeSpan Ventana = TimeSpan.FromSeconds(90);

        [Fact]
        public void Sin_latidos_el_estado_es_SinDatos()
        {
            Assert.Equal(EstadoOperativoPantalla.SinDatos, new Pantalla().CalcularEstadoOperativo(Ahora, Ventana));
        }

        [Theory]
        [InlineData(0, EstadoOperativoPantalla.EnLinea)]
        [InlineData(90, EstadoOperativoPantalla.EnLinea)]
        [InlineData(91, EstadoOperativoPantalla.Desconectada)]
        public void El_estado_depende_de_la_ventana_desde_el_ultimo_latido(int segundosDesdeLatido, EstadoOperativoPantalla esperado)
        {
            var pantalla = new Pantalla { Estado = new EstadoPantalla { UltimaConexionUtc = Ahora.AddSeconds(-segundosDesdeLatido) } };

            Assert.Equal(esperado, pantalla.CalcularEstadoOperativo(Ahora, Ventana));
        }
    }
}
