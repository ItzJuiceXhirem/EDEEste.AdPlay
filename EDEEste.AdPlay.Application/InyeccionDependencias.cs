using EDEEste.AdPlay.Application.CasosDeUso.Anuncios;
using EDEEste.AdPlay.Application.CasosDeUso.Asignaciones;
using EDEEste.AdPlay.Application.CasosDeUso.Auditoria;
using EDEEste.AdPlay.Application.CasosDeUso.Exportaciones;
using EDEEste.AdPlay.Application.CasosDeUso.Historial;
using EDEEste.AdPlay.Application.CasosDeUso.ListasReproduccion;
using EDEEste.AdPlay.Application.CasosDeUso.Multimedia;
using EDEEste.AdPlay.Application.CasosDeUso.Pantallas;
using EDEEste.AdPlay.Application.CasosDeUso.Publicaciones;
using EDEEste.AdPlay.Application.CasosDeUso.Reportes;
using EDEEste.AdPlay.Application.CasosDeUso.Reproductor;
using EDEEste.AdPlay.Application.CasosDeUso.Sucursales;
using EDEEste.AdPlay.Application.CasosDeUso.Usuarios;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace EDEEste.AdPlay.Application
{
    public static class InyeccionDependencias
    {
        public static IServiceCollection AgregarAplicacion(this IServiceCollection services)
        {
            services.TryAddSingleton(TimeProvider.System);

            services.AddScoped<ServicioSucursales>();
            services.AddScoped<ServicioGruposPantallas>();
            services.AddScoped<ServicioPantallas>();
            services.AddScoped<ServicioMultimedia>();
            services.AddScoped<ServicioAnuncios>();
            services.AddScoped<ServicioListasReproduccion>();
            services.AddScoped<ServicioAsignaciones>();
            services.AddScoped<ServicioPublicaciones>();
            services.AddScoped<ServicioExportaciones>();
            services.AddScoped<ServicioReproductor>();

            services.AddScoped<ServicioAutenticacion>();
            services.AddScoped<ServicioUsuarios>();
            services.AddScoped<ServicioFotoPerfil>();
            services.AddScoped<ServicioAuditoria>();
            services.AddScoped<ServicioHistorial>();
            services.AddScoped<ServicioReportes>();

            return services;
        }
    }
}
