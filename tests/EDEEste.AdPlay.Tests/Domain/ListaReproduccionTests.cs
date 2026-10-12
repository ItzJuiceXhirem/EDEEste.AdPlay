using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Exceptions;

namespace EDEEste.AdPlay.Tests.Domain
{
    public class ListaReproduccionTests
    {
        private static readonly DateTime Ahora = new(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc);

        [Fact]
        public void ReemplazarElementos_asigna_posiciones_consecutivas_en_el_orden_recibido()
        {
            var lista = new ListaReproduccion();

            lista.ReemplazarElementos([(AnuncioId: 7, null), (AnuncioId: 3, 15), (AnuncioId: 9, null)], Ahora);

            Assert.Equal([1, 2, 3], lista.Elementos.Select(e => e.Posicion));
            Assert.Equal([7, 3, 9], lista.Elementos.Select(e => e.AnuncioId));
            Assert.Equal(15, lista.Elementos.ElementAt(1).DuracionPersonalizadaSegundos);
            Assert.Equal(Ahora, lista.FechaActualizacionUtc);
        }

        [Fact]
        public void ReemplazarElementos_descarta_los_elementos_anteriores()
        {
            var lista = new ListaReproduccion();
            lista.ReemplazarElementos([(1, null), (2, null)], Ahora);

            lista.ReemplazarElementos([(3, null)], Ahora);

            Assert.Single(lista.Elementos);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-5)]
        [InlineData(3601)]
        public void ReemplazarElementos_rechaza_duraciones_fuera_de_rango_sin_modificar_la_lista(int duracion)
        {
            var lista = new ListaReproduccion();
            lista.ReemplazarElementos([(1, null)], Ahora);

            Assert.Throws<ExcepcionDominio>(() => lista.ReemplazarElementos([(2, duracion)], Ahora));
            Assert.Equal(1, lista.Elementos.Single().AnuncioId);
        }
    }
}
