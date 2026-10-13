using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Application.Validaciones
{
    public static class ValidadorPantallas
    {
        public static void Validar(RegistrarPantallaDto dto)
        {
            var errores = new ErroresValidacion();
            errores.Texto(nameof(dto.CodigoPantalla), dto.CodigoPantalla, LongitudesMaximas.CodigoPantalla);
            errores.Texto(nameof(dto.Nombre), dto.Nombre, LongitudesMaximas.Nombre);
            errores.Texto(nameof(dto.Modelo), dto.Modelo, LongitudesMaximas.Modelo, requerido: false);
            errores.Texto(nameof(dto.NumeroSerie), dto.NumeroSerie, LongitudesMaximas.NumeroSerie, requerido: false);
            if (!Enum.IsDefined(dto.ModoReproduccion))
            {
                errores.Agregar(nameof(dto.ModoReproduccion), "Modo de reproducción no válido.");
            }

            errores.LanzarSiHayErrores();
        }

        public static void Validar(ActualizarPantallaDto dto)
        {
            var errores = new ErroresValidacion();
            if (dto.CodigoPantalla is not null)
            {
                errores.Texto(nameof(dto.CodigoPantalla), dto.CodigoPantalla, LongitudesMaximas.CodigoPantalla);
            }

            if (dto.Nombre is not null)
            {
                errores.Texto(nameof(dto.Nombre), dto.Nombre, LongitudesMaximas.Nombre);
            }

            errores.Texto(nameof(dto.Modelo), dto.Modelo, LongitudesMaximas.Modelo, requerido: false);
            errores.Texto(nameof(dto.NumeroSerie), dto.NumeroSerie, LongitudesMaximas.NumeroSerie, requerido: false);
            if (dto.ModoReproduccion.HasValue && !Enum.IsDefined(dto.ModoReproduccion.Value))
            {
                errores.Agregar(nameof(dto.ModoReproduccion), "Modo de reproducción no válido.");
            }

            errores.LanzarSiHayErrores();
        }
    }
}
