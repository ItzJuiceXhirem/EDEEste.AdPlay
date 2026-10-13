using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Application.Validaciones
{
    public static class ValidadorSucursales
    {
        public static void Validar(GuardarSucursalDto dto)
        {
            var errores = new ErroresValidacion();
            errores.Texto(nameof(dto.Codigo), dto.Codigo, LongitudesMaximas.Codigo);
            errores.Texto(nameof(dto.Nombre), dto.Nombre, LongitudesMaximas.Nombre);
            if (dto.ZonaHorariaId is not null)
            {
                errores.ZonaHoraria(nameof(dto.ZonaHorariaId), dto.ZonaHorariaId);
            }

            errores.LanzarSiHayErrores();
        }

        public static void Validar(GuardarGrupoPantallaDto dto)
        {
            var errores = new ErroresValidacion();
            errores.Texto(nameof(dto.Nombre), dto.Nombre, LongitudesMaximas.Nombre);
            errores.LanzarSiHayErrores();
        }
    }
}
