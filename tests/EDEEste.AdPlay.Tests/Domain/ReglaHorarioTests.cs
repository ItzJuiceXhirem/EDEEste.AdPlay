using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;
using EDEEste.AdPlay.Domain.Exceptions;

namespace EDEEste.AdPlay.Tests.Domain
{
    public class ReglaHorarioTests
    {
        // República Dominicana: UTC-4 todo el año (sin horario de verano).
        private const string Zona = ZonasHorarias.Predeterminada;

        private static ReglaHorario Regla(DiasSemana dias, string inicio, string fin, string zona = Zona) => new()
        {
            DiasSemana = dias,
            HoraInicio = TimeOnly.Parse(inicio),
            HoraFin = TimeOnly.Parse(fin),
            ZonaHorariaId = zona
        };

        /// <summary>Lunes 12 de octubre de 2026, a la hora local indicada, expresado en UTC.</summary>
        private static DateTime LunesLocal(string hora)
        {
            var local = new DateTime(2026, 10, 12).Add(TimeOnly.Parse(hora).ToTimeSpan());
            return DateTime.SpecifyKind(local.AddHours(4), DateTimeKind.Utc);
        }

        [Fact]
        public void El_12_de_octubre_de_2026_es_lunes()
        {
            Assert.Equal(DayOfWeek.Monday, new DateTime(2026, 10, 12).DayOfWeek);
        }

        [Theory]
        [InlineData("07:59", false)]
        [InlineData("08:00", true)]
        [InlineData("12:30", true)]
        [InlineData("17:59", true)]
        [InlineData("18:00", false)]
        public void EstaActivaEn_usa_la_hora_local_de_la_zona_y_el_fin_es_exclusivo(string horaLocal, bool esperado)
        {
            var regla = Regla(DiasSemana.Lunes, "08:00", "18:00");

            Assert.Equal(esperado, regla.EstaActivaEn(LunesLocal(horaLocal)));
        }

        [Fact]
        public void EstaActivaEn_respeta_los_dias_de_la_semana()
        {
            var soloMartes = Regla(DiasSemana.Martes, "00:00", "23:59");

            Assert.False(soloMartes.EstaActivaEn(LunesLocal("12:00")));
        }

        [Fact]
        public void EstaActivaEn_una_regla_inactiva_nunca_aplica()
        {
            var regla = Regla(DiasSemana.Todos, "00:00", "23:59");
            regla.EstaActiva = false;

            Assert.False(regla.EstaActivaEn(LunesLocal("12:00")));
        }

        [Fact]
        public void EstaActivaEn_considera_el_cambio_de_dia_entre_UTC_y_la_hora_local()
        {
            // 02:00 UTC del martes es todavía lunes 22:00 en la zona local.
            var instante = new DateTime(2026, 10, 13, 2, 0, 0, DateTimeKind.Utc);
            var regla = Regla(DiasSemana.Lunes, "20:00", "23:00");

            Assert.True(regla.EstaActivaEn(instante));
        }

        [Fact]
        public void Validar_rechaza_dias_vacios_hora_fin_no_posterior_y_zona_desconocida()
        {
            Assert.Throws<ExcepcionDominio>(() => Regla(DiasSemana.Ninguno, "08:00", "18:00").Validar());
            Assert.Throws<ExcepcionDominio>(() => Regla(DiasSemana.Lunes, "18:00", "08:00").Validar());
            Assert.Throws<ExcepcionDominio>(() => Regla(DiasSemana.Lunes, "08:00", "08:00").Validar());
            Assert.Throws<ExcepcionDominio>(() => Regla(DiasSemana.Lunes, "08:00", "18:00", "Marte/Olympus").Validar());
        }

        [Fact]
        public void Validar_acepta_una_regla_correcta()
        {
            Regla(DiasSemana.Lunes | DiasSemana.Viernes, "08:00", "18:00").Validar();
        }

        [Theory]
        [InlineData("08:00", "12:00", "11:00", "14:00", true)]
        [InlineData("08:00", "12:00", "12:00", "14:00", false)] // el fin es exclusivo
        [InlineData("08:00", "12:00", "13:00", "14:00", false)]
        public void SeSolapaCon_compara_franjas_del_mismo_dia(string i1, string f1, string i2, string f2, bool esperado)
        {
            var a = Regla(DiasSemana.Lunes, i1, f1);
            var b = Regla(DiasSemana.Lunes, i2, f2);

            Assert.Equal(esperado, a.SeSolapaCon(b, LunesLocal("00:00")));
        }

        [Fact]
        public void SeSolapaCon_no_coincide_si_los_dias_son_distintos()
        {
            var lunes = Regla(DiasSemana.Lunes, "08:00", "12:00");
            var martes = Regla(DiasSemana.Martes, "08:00", "12:00");

            Assert.False(lunes.SeSolapaCon(martes, LunesLocal("00:00")));
        }

        [Fact]
        public void SeSolapaCon_compara_reglas_de_zonas_distintas_en_UTC()
        {
            // 08:00-12:00 en Santo Domingo (UTC-4) equivale a 12:00-16:00 UTC.
            var santoDomingo = Regla(DiasSemana.Lunes, "08:00", "12:00");
            var utcSolapa = Regla(DiasSemana.Lunes, "11:00", "13:00", "UTC");
            var utcNoSolapa = Regla(DiasSemana.Lunes, "08:00", "12:00", "UTC");

            Assert.True(santoDomingo.SeSolapaCon(utcSolapa, LunesLocal("00:00")));
            Assert.False(santoDomingo.SeSolapaCon(utcNoSolapa, LunesLocal("00:00")));
        }

        [Fact]
        public void SeSolapaCon_maneja_franjas_que_cruzan_el_final_de_la_semana()
        {
            // Sábado 22:00-23:59 local (UTC-4) cae en domingo UTC; debe coincidir con una regla UTC del domingo.
            var sabadoNoche = Regla(DiasSemana.Sabado, "22:00", "23:59");
            var domingoUtc = Regla(DiasSemana.Domingo, "02:30", "03:00", "UTC");

            Assert.True(sabadoNoche.SeSolapaCon(domingoUtc, LunesLocal("00:00")));
        }
    }
}
