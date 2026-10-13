using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Infrastructure.Almacenamiento;
using EDEEste.AdPlay.Infrastructure.Auditoria;
using EDEEste.AdPlay.Infrastructure.Identidad;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using EDEEste.AdPlay.Infrastructure.Repositorios;
using EDEEste.AdPlay.Infrastructure.Servicios;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EDEEste.AdPlay.Infrastructure
{
    public static class InyeccionDependencias
    {
        // Política de contraseñas y bloqueo. Cambiarla aquí afecta solo a las contraseñas que se creen desde ahora.
        private const int LongitudMinimaClave = 10;
        private const int IntentosAntesDeBloqueo = 5;
        private static readonly TimeSpan DuracionBloqueo = TimeSpan.FromMinutes(10);

        /// <summary>
        /// Registra EF Core, Identity, repositorios, auditoría, almacenamiento y generación de paquetes.
        /// Las opciones de <see cref="OpcionesAlmacenamiento"/> deben configurarse desde la API.
        /// Requiere que la API registre una implementación de <see cref="IUsuarioActual"/>.
        /// </summary>
        public static IServiceCollection AgregarInfraestructura(this IServiceCollection services, string cadenaConexion)
        {
            services.AddDbContext<ContextoPublicidad>(options =>
                options.UseSqlServer(cadenaConexion, sql =>
                    sql.MigrationsHistoryTable("HistorialMigraciones")));

            services.AddScoped<IUnidadDeTrabajo, UnidadDeTrabajo>();
            services.AddScoped<IRepositorioSucursales, RepositorioSucursales>();
            services.AddScoped<IRepositorioGruposPantallas, RepositorioGruposPantallas>();
            services.AddScoped<IRepositorioPantallas, RepositorioPantallas>();
            services.AddScoped<IRepositorioMultimedia, RepositorioMultimedia>();
            services.AddScoped<IRepositorioAnuncios, RepositorioAnuncios>();
            services.AddScoped<IRepositorioListas, RepositorioListas>();
            services.AddScoped<IRepositorioAsignaciones, RepositorioAsignaciones>();
            services.AddScoped<IRepositorioPublicaciones, RepositorioPublicaciones>();
            services.AddScoped<IRepositorioExportaciones, RepositorioExportaciones>();
            services.AddScoped<IRepositorioAuditoria, RepositorioAuditoria>();

            // Una misma instancia por operación: la unidad de trabajo guarda lo que los servicios registran.
            services.AddScoped<RegistroAuditoriaEf>();
            services.AddScoped<IRegistroAuditoria>(sp => sp.GetRequiredService<RegistroAuditoriaEf>());

            services.AddIdentityCore<UsuarioAplicacion>(ConfigurarIdentidad)
                .AddRoles<RolAplicacion>()
                .AddEntityFrameworkStores<ContextoPublicidad>()
                .AddErrorDescriber<DescriptorErroresIdentidadEs>();
            services.AddScoped<IGestorUsuarios, GestorUsuarios>();

            services.AddSingleton<IAlmacenamientoMultimedia, AlmacenamientoMultimediaDisco>();
            services.AddScoped<IGeneradorPaquetes, GeneradorPaquetesZip>();

            return services;
        }

        private static void ConfigurarIdentidad(IdentityOptions opciones)
        {
            opciones.User.RequireUniqueEmail = true;

            opciones.Password.RequiredLength = LongitudMinimaClave;
            opciones.Password.RequireDigit = true;
            opciones.Password.RequireLowercase = true;
            opciones.Password.RequireUppercase = true;
            opciones.Password.RequireNonAlphanumeric = false;

            opciones.Lockout.AllowedForNewUsers = true;
            opciones.Lockout.MaxFailedAccessAttempts = IntentosAntesDeBloqueo;
            opciones.Lockout.DefaultLockoutTimeSpan = DuracionBloqueo;
        }
    }
}
