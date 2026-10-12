using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Application.Validaciones
{
    public static class ValidadorListasReproduccion
    {
        public const int MaximoElementos = 200;

        public static void Validar(GuardarListaReproduccionDto dto)
        {
            var errores = new ErroresValidacion();
            errores.Texto(nameof(dto.Nombre), dto.Nombre, LongitudesMaximas.Nombre);
            errores.Texto(nameof(dto.Descripcion), dto.Descripcion, LongitudesMaximas.Descripcion, requerido: false);

            var elementos = dto.Elementos ?? [];
            if (elementos.Count > MaximoElementos)
            {
                errores.Agregar(nameof(dto.Elementos), $"Una lista no puede tener más de {MaximoElementos} elementos.");
            }

            for (var i = 0; i < elementos.Count; i++)
            {
                errores.Rango(
                    $"{nameof(dto.Elementos)}[{i}].{nameof(GuardarElementoListaDto.DuracionPersonalizadaSegundos)}",
                    elementos[i].DuracionPersonalizadaSegundos,
                    ReglasDuracion.MinimoSegundos,
                    ReglasDuracion.MaximoSegundos);
            }

            errores.LanzarSiHayErrores();
        }
    }
}
