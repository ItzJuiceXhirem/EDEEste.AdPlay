using EDEEste.AdPlay.Domain.Common;
using Microsoft.AspNetCore.Authorization;

namespace EDEEste.AdPlay.API.Seguridad
{
    /// <summary>
    /// Políticas de autorización. Por defecto toda la API exige un usuario autenticado (política alternativa);
    /// los endpoints del reproductor son anónimos porque se autentican con el token de su pantalla.
    /// </summary>
    public static class PoliticasAcceso
    {
        /// <summary>Cualquier usuario autenticado: consultar.</summary>
        public const string Lectura = "Lectura";

        /// <summary>Administrador u Operador: preparar contenido (multimedia, anuncios, listas) y exportar paquetes.</summary>
        public const string Contenido = "Contenido";

        /// <summary>Solo Administrador: estructura, asignaciones, publicación, usuarios y auditoría.</summary>
        public const string Administracion = "Administracion";

        public static void Configurar(AuthorizationOptions opciones)
        {
            opciones.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();

            opciones.AddPolicy(Lectura, p => p.RequireAuthenticatedUser());
            opciones.AddPolicy(Contenido, p => p.RequireRole(RolesSistema.Administrador, RolesSistema.Operador));
            opciones.AddPolicy(Administracion, p => p.RequireRole(RolesSistema.Administrador));
        }
    }
}
