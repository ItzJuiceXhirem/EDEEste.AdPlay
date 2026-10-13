using System.Net.Mail;
using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Application.Validaciones
{
    /// <summary>
    /// Validaciones de los datos de una cuenta. La contraseña la valida la política de Identity, no esta clase.
    /// </summary>
    public static class ValidadorUsuarios
    {
        public static void Correo(ErroresValidacion errores, string campo, string? correo)
        {
            errores.Texto(campo, correo, LongitudesMaximas.Correo);
            if (!string.IsNullOrWhiteSpace(correo) && !EsCorreoValido(correo.Trim()))
            {
                errores.Agregar(campo, "No es una dirección de correo válida.");
            }
        }

        public static void Nombre(ErroresValidacion errores, string campo, string? nombre) =>
            errores.Texto(campo, nombre, LongitudesMaximas.NombreCompleto);

        public static void Rol(ErroresValidacion errores, string campo, string? rol)
        {
            if (rol is null || !RolesSistema.Todos.Contains(rol))
            {
                errores.Agregar(campo, $"Debe ser uno de: {string.Join(", ", RolesSistema.Todos)}.");
            }
        }

        public static void Clave(ErroresValidacion errores, string campo, string? clave)
        {
            if (string.IsNullOrEmpty(clave))
            {
                errores.Agregar(campo, "Es obligatoria.");
            }
        }

        /// <summary>Rechaza formas como "Nombre &lt;a@b.com&gt;": la dirección debe ser exactamente lo escrito.</summary>
        private static bool EsCorreoValido(string correo) =>
            MailAddress.TryCreate(correo, out var direccion) && direccion.Address == correo;
    }
}
