using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.Contratos.Servicios
{
    /// <summary>
    /// Registra acciones de los usuarios. Los registros se guardan junto con los cambios de la operación
    /// (<see cref="Persistencia.IUnidadDeTrabajo"/>), de modo que o se persisten ambos o ninguno.
    /// Nunca incluya contraseñas, tokens ni otros secretos en el detalle.
    /// </summary>
    public interface IRegistroAuditoria
    {
        /// <summary>Registra una acción sobre una entidad; su identificador se toma al guardar, si es nueva.</summary>
        void Registrar(AccionAuditoria accion, EntidadBase entidad, string? detalle = null);

        /// <summary>Registra una acción sobre algo que no es una entidad del dominio (por ejemplo, un usuario).</summary>
        /// <param name="usuarioId">Actor, si no es el usuario actual (por ejemplo, en un inicio de sesión).</param>
        void Registrar(AccionAuditoria accion, string tipoEntidad, int? entidadId, string? detalle = null, int? usuarioId = null);
    }
}
