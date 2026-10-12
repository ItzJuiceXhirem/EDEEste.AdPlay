using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.Comunes
{
    public static class AuditoriaExtensions
    {
        /// <summary>Habilitar o deshabilitar si cambió el estado; Editar en cualquier otro caso.</summary>
        public static AccionAuditoria AccionDeEdicion(bool habilitadaAntes, bool habilitadaDespues) =>
            habilitadaAntes == habilitadaDespues
                ? AccionAuditoria.Editar
                : habilitadaDespues ? AccionAuditoria.Habilitar : AccionAuditoria.Deshabilitar;
    }
}
