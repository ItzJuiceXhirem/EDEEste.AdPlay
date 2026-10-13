using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Domain.Exceptions;

namespace EDEEste.AdPlay.Tests.Domain
{
    public class AsignacionListaTests
    {
        private static readonly DateTime Ahora = new(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc);

        [Theory]
        [InlineData(null, null, null, false)]
        [InlineData(1, null, null, true)]
        [InlineData(null, 1, null, true)]
        [InlineData(null, null, 1, true)]
        [InlineData(1, 1, null, false)]
        [InlineData(1, 1, 1, false)]
        public void TieneDestinoUnico_exige_exactamente_un_destino(int? sucursal, int? grupo, int? pantalla, bool esperado)
        {
            var asignacion = new AsignacionLista { SucursalId = sucursal, GrupoPantallaId = grupo, PantallaId = pantalla };

            Assert.Equal(esperado, asignacion.TieneDestinoUnico());
        }

        [Fact]
        public void Validar_rechaza_asignacion_sin_destino()
        {
            Assert.Throws<ExcepcionDominio>(() => new AsignacionLista().Validar());
        }

        [Fact]
        public void Validar_rechaza_fin_anterior_o_igual_al_inicio()
        {
            var asignacion = new AsignacionLista { SucursalId = 1, FechaInicioUtc = Ahora, FechaFinUtc = Ahora };

            Assert.Throws<ExcepcionDominio>(asignacion.Validar);
        }

        [Fact]
        public void Nivel_corresponde_al_destino()
        {
            Assert.Equal(NivelAsignacion.Pantalla, new AsignacionLista { PantallaId = 1 }.Nivel);
            Assert.Equal(NivelAsignacion.GrupoPantalla, new AsignacionLista { GrupoPantallaId = 1 }.Nivel);
            Assert.Equal(NivelAsignacion.Sucursal, new AsignacionLista { SucursalId = 1 }.Nivel);
        }

        [Fact]
        public void EstaVigente_respeta_habilitacion_y_rango_de_fechas()
        {
            var abierta = new AsignacionLista { SucursalId = 1 };
            var vencida = new AsignacionLista { SucursalId = 1, FechaFinUtc = Ahora };
            var futura = new AsignacionLista { SucursalId = 1, FechaInicioUtc = Ahora.AddDays(1) };
            var deshabilitada = new AsignacionLista { SucursalId = 1, EstaHabilitada = false };

            Assert.True(abierta.EstaVigente(Ahora));
            Assert.False(vencida.EstaVigente(Ahora));
            Assert.False(futura.EstaVigente(Ahora));
            Assert.False(deshabilitada.EstaVigente(Ahora));
        }

        [Fact]
        public void VigenciaSeSolapaCon_trata_los_extremos_nulos_como_abiertos()
        {
            var siempre = new AsignacionLista { SucursalId = 1 };
            var octubre = new AsignacionLista { SucursalId = 1, FechaInicioUtc = Ahora, FechaFinUtc = Ahora.AddDays(30) };
            var noviembre = new AsignacionLista { SucursalId = 1, FechaInicioUtc = Ahora.AddDays(30), FechaFinUtc = Ahora.AddDays(60) };

            Assert.True(siempre.VigenciaSeSolapaCon(octubre));
            Assert.False(octubre.VigenciaSeSolapaCon(noviembre));
            Assert.False(noviembre.VigenciaSeSolapaCon(octubre));
        }

        private static ReglaHorario Franja(string inicio, string fin, DiasSemana dias = DiasSemana.Lunes) => new()
        {
            DiasSemana = dias,
            HoraInicio = TimeOnly.Parse(inicio),
            HoraFin = TimeOnly.Parse(fin),
            ZonaHorariaId = EDEEste.AdPlay.Domain.Common.ZonasHorarias.Predeterminada
        };

        [Fact]
        public void EstaActivaEn_sin_reglas_aplica_siempre_dentro_de_la_vigencia()
        {
            var asignacion = new AsignacionLista { SucursalId = 1 };

            Assert.True(asignacion.EstaActivaEn(Ahora));
        }

        [Fact]
        public void EstaActivaEn_con_reglas_solo_aplica_dentro_de_alguna_franja()
        {
            var asignacion = new AsignacionLista { SucursalId = 1 };
            asignacion.ReglasHorario.Add(Franja("08:00", "18:00", DiasSemana.Todos));

            var mediodiaLocal = new DateTime(2026, 10, 12, 16, 0, 0, DateTimeKind.Utc); // 12:00 en UTC-4
            var madrugadaLocal = new DateTime(2026, 10, 12, 6, 0, 0, DateTimeKind.Utc); // 02:00 en UTC-4

            Assert.True(asignacion.EstaActivaEn(mediodiaLocal));
            Assert.False(asignacion.EstaActivaEn(madrugadaLocal));
        }

        [Fact]
        public void EstaActivaEn_ignora_las_reglas_inactivas()
        {
            var asignacion = new AsignacionLista { SucursalId = 1 };
            var regla = Franja("08:00", "09:00");
            regla.EstaActiva = false;
            asignacion.ReglasHorario.Add(regla);

            Assert.True(asignacion.EstaActivaEn(Ahora));
        }

        [Fact]
        public void EsAmbiguaCon_exige_coincidir_en_fechas_y_en_horario()
        {
            var manana = new AsignacionLista { SucursalId = 1 };
            manana.ReglasHorario.Add(Franja("06:00", "12:00"));
            var tarde = new AsignacionLista { SucursalId = 1 };
            tarde.ReglasHorario.Add(Franja("12:00", "20:00"));
            var siempre = new AsignacionLista { SucursalId = 1 };

            Assert.False(manana.EsAmbiguaCon(tarde, Ahora)); // turnos complementarios
            Assert.True(manana.EsAmbiguaCon(siempre, Ahora)); // una sin horario aplica siempre
            Assert.True(siempre.EsAmbiguaCon(siempre, Ahora));
        }

        [Fact]
        public void Validar_valida_tambien_las_reglas_de_horario()
        {
            var asignacion = new AsignacionLista { SucursalId = 1 };
            asignacion.ReglasHorario.Add(Franja("18:00", "08:00"));

            Assert.Throws<ExcepcionDominio>(asignacion.Validar);
        }
    }
}
