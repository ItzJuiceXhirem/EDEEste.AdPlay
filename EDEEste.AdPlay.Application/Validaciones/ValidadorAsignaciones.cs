using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.Validaciones
{
    public static class ValidadorAsignaciones
    {
        public const int MaximoHorarios = 20;

        public static void Validar(GuardarAsignacionDto dto)
        {
            var errores = new ErroresValidacion();
            var destinos = (dto.SucursalId.HasValue ? 1 : 0) + (dto.GrupoPantallaId.HasValue ? 1 : 0) + (dto.PantallaId.HasValue ? 1 : 0);
            if (destinos != 1)
            {
                errores.Agregar("Destino", "Indique exactamente un destino: sucursal, grupo o pantalla.");
            }

            if (dto.FechaInicioUtc.HasValue && dto.FechaFinUtc.HasValue && dto.FechaFinUtc <= dto.FechaInicioUtc)
            {
                errores.Agregar(nameof(dto.FechaFinUtc), "Debe ser posterior a la fecha de inicio.");
            }

            ValidarHorarios(dto.Horarios, errores);
            errores.LanzarSiHayErrores();
        }

        private static void ValidarHorarios(IReadOnlyList<GuardarReglaHorarioDto>? horarios, ErroresValidacion errores)
        {
            if (horarios is null)
            {
                return;
            }

            if (horarios.Count > MaximoHorarios)
            {
                errores.Agregar(nameof(GuardarAsignacionDto.Horarios), $"No puede haber más de {MaximoHorarios} horarios por asignación.");
            }

            for (var i = 0; i < horarios.Count; i++)
            {
                var campo = $"{nameof(GuardarAsignacionDto.Horarios)}[{i}]";
                var horario = horarios[i];

                if (horario.Dias.Count == 0)
                {
                    errores.Agregar($"{campo}.{nameof(horario.Dias)}", "Seleccione al menos un día.");
                }
                else if (horario.Dias.Any(d => d is DiasSemana.Ninguno or DiasSemana.Todos || !Enum.IsDefined(d)))
                {
                    errores.Agregar($"{campo}.{nameof(horario.Dias)}", "Indique días individuales (Lunes, Martes, ...).");
                }

                if (horario.HoraFin <= horario.HoraInicio)
                {
                    errores.Agregar($"{campo}.{nameof(horario.HoraFin)}", "Debe ser posterior a la hora de inicio.");
                }

                if (horario.ZonaHorariaId is not null)
                {
                    errores.ZonaHoraria($"{campo}.{nameof(horario.ZonaHorariaId)}", horario.ZonaHorariaId);
                }
            }
        }
    }
}
