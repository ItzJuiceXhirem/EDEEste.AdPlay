using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Services;

namespace EDEEste.AdPlay.Tests.Domain
{
    public class ResolutorAsignacionesTests
    {
        private static readonly DateTime Ahora = new(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc);

        // Cadena: grupo 20 (el de la pantalla) y su ancestro 10.
        private static readonly IReadOnlyList<int> Cadena = [20, 10];

        private static AsignacionLista Asignacion(int id, int? sucursal = null, int? grupo = null, int? pantalla = null) => new()
        {
            Id = id,
            SucursalId = sucursal,
            GrupoPantallaId = grupo,
            PantallaId = pantalla,
            FechaCreacionUtc = Ahora.AddDays(-id),
            ListaReproduccion = new ListaReproduccion { Id = id, EstaActiva = true }
        };

        [Fact]
        public void Ordena_pantalla_antes_que_grupo_y_grupo_antes_que_sucursal()
        {
            var sucursal = Asignacion(1, sucursal: 1);
            var grupo = Asignacion(2, grupo: 20);
            var pantalla = Asignacion(3, pantalla: 5);

            var resultado = ResolutorAsignaciones.ObtenerCandidatas([sucursal, grupo, pantalla], 5, 1, Cadena, Ahora);

            Assert.Equal([3, 2, 1], resultado.Select(a => a.Id));
        }

        [Fact]
        public void El_grupo_mas_cercano_tiene_prioridad_sobre_sus_ancestros()
        {
            var ancestro = Asignacion(1, grupo: 10);
            var cercano = Asignacion(2, grupo: 20);

            var resultado = ResolutorAsignaciones.ObtenerCandidatas([ancestro, cercano], 5, 1, Cadena, Ahora);

            Assert.Equal([2, 1], resultado.Select(a => a.Id));
        }

        [Fact]
        public void A_igual_prioridad_gana_la_asignacion_mas_reciente()
        {
            var antigua = Asignacion(5, sucursal: 1);
            var reciente = Asignacion(1, sucursal: 1);

            var resultado = ResolutorAsignaciones.ObtenerCandidatas([antigua, reciente], 5, 1, Cadena, Ahora);

            Assert.Equal(1, resultado[0].Id);
        }

        [Fact]
        public void Descarta_asignaciones_no_vigentes_o_con_lista_inactiva()
        {
            var vencida = Asignacion(1, sucursal: 1);
            vencida.FechaFinUtc = Ahora.AddHours(-1);
            var listaInactiva = Asignacion(2, sucursal: 1);
            listaInactiva.ListaReproduccion.EstaActiva = false;
            var valida = Asignacion(3, sucursal: 1);

            var resultado = ResolutorAsignaciones.ObtenerCandidatas([vencida, listaInactiva, valida], 5, 1, Cadena, Ahora);

            Assert.Equal([3], resultado.Select(a => a.Id));
        }

        [Fact]
        public void Fuera_del_horario_de_la_pantalla_cae_a_la_asignacion_de_menor_prioridad()
        {
            var porDefecto = Asignacion(1, sucursal: 1);
            var turnoManana = Asignacion(2, pantalla: 5);
            turnoManana.ReglasHorario.Add(new ReglaHorario
            {
                DiasSemana = EDEEste.AdPlay.Domain.Enums.DiasSemana.Todos,
                HoraInicio = new TimeOnly(6, 0),
                HoraFin = new TimeOnly(12, 0),
                ZonaHorariaId = "UTC"
            });

            var diez = new DateTime(2026, 10, 12, 10, 0, 0, DateTimeKind.Utc);
            var quince = new DateTime(2026, 10, 12, 15, 0, 0, DateTimeKind.Utc);

            Assert.Equal([2, 1], ResolutorAsignaciones.ObtenerCandidatas([porDefecto, turnoManana], 5, 1, Cadena, diez).Select(a => a.Id));
            Assert.Equal([1], ResolutorAsignaciones.ObtenerCandidatas([porDefecto, turnoManana], 5, 1, Cadena, quince).Select(a => a.Id));
        }

        [Fact]
        public void Ignora_asignaciones_dirigidas_a_otra_pantalla_grupo_o_sucursal()
        {
            var deOtraPantalla = Asignacion(1, pantalla: 99);
            var deOtroGrupo = Asignacion(2, grupo: 77);
            var deOtraSucursal = Asignacion(3, sucursal: 2);
            var propia = Asignacion(4, grupo: 10);

            var resultado = ResolutorAsignaciones.ObtenerCandidatas(
                [deOtraPantalla, deOtroGrupo, deOtraSucursal, propia], 5, 1, Cadena, Ahora);

            Assert.Equal([4], resultado.Select(a => a.Id));
        }
    }
}
