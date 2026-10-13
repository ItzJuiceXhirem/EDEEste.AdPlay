using Microsoft.AspNetCore.Identity;

namespace EDEEste.AdPlay.Infrastructure.Identidad
{
    public class RolAplicacion : IdentityRole<int>
    {
        public RolAplicacion()
        {
        }

        public RolAplicacion(string nombre) : base(nombre)
        {
        }
    }
}
