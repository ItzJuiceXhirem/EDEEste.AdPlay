using Microsoft.AspNetCore.Identity;

namespace EDEEste.AdPlay.Infrastructure.Identidad
{
    /// <summary>
    /// Mensajes de Identity en español, con la longitud mínima real de la política de contraseñas.
    /// </summary>
    public class DescriptorErroresIdentidadEs : IdentityErrorDescriber
    {
        public override IdentityError DefaultError() => Crear(nameof(DefaultError), "Ocurrió un error desconocido.");

        public override IdentityError DuplicateEmail(string email) =>
            Crear(nameof(DuplicateEmail), "Ya existe un usuario con ese correo.");

        public override IdentityError DuplicateUserName(string userName) =>
            Crear(nameof(DuplicateUserName), "Ya existe un usuario con ese correo.");

        public override IdentityError InvalidEmail(string? email) =>
            Crear(nameof(InvalidEmail), "El correo no es válido.");

        public override IdentityError InvalidUserName(string? userName) =>
            Crear(nameof(InvalidUserName), "El nombre de usuario no es válido.");

        public override IdentityError PasswordMismatch() =>
            Crear(nameof(PasswordMismatch), "La contraseña actual no es correcta.");

        public override IdentityError PasswordTooShort(int length) =>
            Crear(nameof(PasswordTooShort), $"La contraseña debe tener al menos {length} caracteres.");

        public override IdentityError PasswordRequiresDigit() =>
            Crear(nameof(PasswordRequiresDigit), "La contraseña debe incluir al menos un número.");

        public override IdentityError PasswordRequiresLower() =>
            Crear(nameof(PasswordRequiresLower), "La contraseña debe incluir al menos una letra minúscula.");

        public override IdentityError PasswordRequiresUpper() =>
            Crear(nameof(PasswordRequiresUpper), "La contraseña debe incluir al menos una letra mayúscula.");

        public override IdentityError PasswordRequiresNonAlphanumeric() =>
            Crear(nameof(PasswordRequiresNonAlphanumeric), "La contraseña debe incluir al menos un símbolo.");

        public override IdentityError PasswordRequiresUniqueChars(int uniqueChars) =>
            Crear(nameof(PasswordRequiresUniqueChars), $"La contraseña debe tener al menos {uniqueChars} caracteres distintos.");

        public override IdentityError UserAlreadyInRole(string role) =>
            Crear(nameof(UserAlreadyInRole), "El usuario ya tiene ese rol.");

        public override IdentityError UserNotInRole(string role) =>
            Crear(nameof(UserNotInRole), "El usuario no tiene ese rol.");

        private static IdentityError Crear(string codigo, string descripcion) =>
            new() { Code = codigo, Description = descripcion };
    }
}
