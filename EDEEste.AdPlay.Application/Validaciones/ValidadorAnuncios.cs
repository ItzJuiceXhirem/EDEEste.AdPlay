using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Application.Validaciones
{
    public static class ValidadorAnuncios
    {
        public static void Validar(GuardarAnuncioDto dto)
        {
            var errores = new ErroresValidacion();
            errores.Texto(nameof(dto.Titulo), dto.Titulo, LongitudesMaximas.Titulo);
            errores.Texto(nameof(dto.Descripcion), dto.Descripcion, LongitudesMaximas.Descripcion, requerido: false);
            errores.Rango(
                nameof(dto.DuracionPredeterminadaSegundos),
                dto.DuracionPredeterminadaSegundos,
                ReglasDuracion.MinimoSegundos,
                ReglasDuracion.MaximoSegundos);
            errores.LanzarSiHayErrores();
        }
    }
}
