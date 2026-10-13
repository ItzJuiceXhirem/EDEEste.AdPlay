using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Quién hizo qué y cuándo. Nunca debe contener contraseñas, tokens ni otros secretos.
    /// </summary>
    public class RegistroAuditoria : EntidadBase
    {
        /// <summary>Nulo cuando no hay un usuario identificado (por ejemplo, un inicio de sesión fallido).</summary>
        public int? UsuarioId { get; set; }

        public AccionAuditoria Accion { get; set; }
        public string TipoEntidad { get; set; } = string.Empty;
        public int? EntidadId { get; set; }
        public DateTime FechaUtc { get; set; }
        public string? Detalle { get; set; }
    }
}
