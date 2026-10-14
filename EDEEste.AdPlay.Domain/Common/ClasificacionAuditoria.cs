using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Domain.Common
{
    public static class ClasificacionAuditoria
    {
        /// <summary>Acciones que conviene revisar: quitan contenido o acceso, o indican un intento de entrada fallido.</summary>
        public static readonly IReadOnlySet<AccionAuditoria> AccionesDeRiesgo = new HashSet<AccionAuditoria>
        {
            AccionAuditoria.InicioSesionFallido,
            AccionAuditoria.Eliminar,
            AccionAuditoria.Retirar,
            AccionAuditoria.Deshabilitar,
            AccionAuditoria.RevocarToken
        };

        public static bool EsDeRiesgo(AccionAuditoria accion) => AccionesDeRiesgo.Contains(accion);
    }
}
