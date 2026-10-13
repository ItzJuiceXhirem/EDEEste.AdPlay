using EDEEste.AdPlay.Domain.Common;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EDEEste.AdPlay.Infrastructure.Identidad
{
    /// <summary>
    /// Datos del primer administrador. Salen de la configuración (User Secrets o variables de entorno),
    /// nunca del repositorio.
    /// </summary>
    public sealed class OpcionesAdministradorInicial
    {
        public const string Seccion = "Seguridad:AdministradorInicial";

        public string? Correo { get; set; }
        public string? NombreCompleto { get; set; }
        public string? Clave { get; set; }

        public bool EstaConfigurado => !string.IsNullOrWhiteSpace(Correo) && !string.IsNullOrEmpty(Clave);
    }

    public static class InicializadorSeguridad
    {
        /// <summary>
        /// Crea los roles que falten y, si no existe ningún usuario y hay un administrador inicial configurado, lo crea.
        /// Es idempotente: se puede ejecutar en cada arranque.
        /// </summary>
        public static async Task InicializarAsync(
            IServiceProvider servicios, OpcionesAdministradorInicial administrador, CancellationToken ct = default)
        {
            await using var alcance = servicios.CreateAsyncScope();
            var proveedor = alcance.ServiceProvider;
            var logger = proveedor.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(InicializadorSeguridad));
            var roles = proveedor.GetRequiredService<RoleManager<RolAplicacion>>();
            var usuarios = proveedor.GetRequiredService<UserManager<UsuarioAplicacion>>();
            var reloj = proveedor.GetRequiredService<TimeProvider>();

            foreach (var rol in RolesSistema.Todos)
            {
                if (!await roles.RoleExistsAsync(rol))
                {
                    (await roles.CreateAsync(new RolAplicacion(rol))).ThrowIfFailed($"No se pudo crear el rol {rol}");
                }
            }

            if (await usuarios.Users.AnyAsync(ct))
            {
                return;
            }

            if (!administrador.EstaConfigurado)
            {
                logger.LogWarning(
                    "No hay usuarios y no se configuró '{Seccion}'. Defina Correo y Clave para crear el primer administrador.",
                    OpcionesAdministradorInicial.Seccion);
                return;
            }

            var correo = administrador.Correo!.Trim();
            var usuario = new UsuarioAplicacion
            {
                UserName = correo,
                Email = correo,
                EmailConfirmed = true,
                NombreCompleto = string.IsNullOrWhiteSpace(administrador.NombreCompleto) ? "Administrador" : administrador.NombreCompleto.Trim(),
                EstaActivo = true,
                FechaCreacionUtc = reloj.GetUtcNow().UtcDateTime
            };

            (await usuarios.CreateAsync(usuario, administrador.Clave!)).ThrowIfFailed("No se pudo crear el administrador inicial");
            (await usuarios.AddToRoleAsync(usuario, RolesSistema.Administrador)).ThrowIfFailed("No se pudo asignar el rol");
            logger.LogInformation("Se creó el administrador inicial {Correo}.", correo);
        }

        private static void ThrowIfFailed(this IdentityResult resultado, string mensaje)
        {
            if (!resultado.Succeeded)
            {
                throw new InvalidOperationException($"{mensaje}: {string.Join("; ", resultado.Errors.Select(e => e.Description))}");
            }
        }
    }
}
