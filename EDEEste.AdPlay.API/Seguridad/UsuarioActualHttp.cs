using System.Security.Claims;
using EDEEste.AdPlay.Application.Contratos.Servicios;

namespace EDEEste.AdPlay.API.Seguridad
{
    /// <summary>
    /// Usuario de la petición HTTP en curso, tomado de los claims del token de sesión.
    /// </summary>
    public sealed class UsuarioActualHttp : IUsuarioActual
    {
        private readonly IHttpContextAccessor _accesor;

        public UsuarioActualHttp(IHttpContextAccessor accesor)
        {
            _accesor = accesor;
        }

        private ClaimsPrincipal? Principal => _accesor.HttpContext?.User;

        public bool EstaAutenticado => Principal?.Identity?.IsAuthenticated == true;

        public int? Id =>
            int.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

        public string? Nombre => Principal?.FindFirstValue(ClaimTypes.Name);
    }
}
