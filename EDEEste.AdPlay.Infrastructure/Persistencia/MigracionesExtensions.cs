using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EDEEste.AdPlay.Infrastructure.Persistencia
{
    public static class MigracionesExtensions
    {
        /// <summary>
        /// Aplica las migraciones pendientes. Pensado para desarrollo; en producción conviene aplicarlas
        /// como un paso controlado del despliegue.
        /// </summary>
        public static async Task AplicarMigracionesAsync(this IServiceProvider servicios, CancellationToken ct = default)
        {
            await using var alcance = servicios.CreateAsyncScope();
            var contexto = alcance.ServiceProvider.GetRequiredService<ContextoPublicidad>();
            await contexto.Database.MigrateAsync(ct);
        }
    }
}
