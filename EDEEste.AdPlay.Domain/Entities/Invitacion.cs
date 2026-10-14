using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Domain.Entities
{
    /// <summary>
    /// Invitación de un administrador para que una persona active su propia cuenta con el rol indicado. El enlace
    /// lleva un token de un solo uso; aquí solo se guarda su hash.
    /// </summary>
    public class Invitacion : EntidadBase
    {
        public string Correo { get; set; } = string.Empty;
        public string NombreCompleto { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty;
        public string TokenHash { get; set; } = string.Empty;
        public DateTime FechaCreacionUtc { get; set; }
        public DateTime VenceUtc { get; set; }
        public int? UsuarioCreadorId { get; set; }

        /// <summary>Cuándo se usó para crear la cuenta; nula mientras no se use.</summary>
        public DateTime? FechaActivacionUtc { get; set; }

        /// <summary>Cuenta creada con la invitación.</summary>
        public int? UsuarioActivadoId { get; set; }

        /// <summary>Cuándo la anuló un administrador o la reemplazó una invitación nueva al mismo correo.</summary>
        public DateTime? FechaRevocacionUtc { get; set; }

        public EstadoInvitacion EstadoEn(DateTime ahoraUtc) =>
            FechaActivacionUtc is not null ? EstadoInvitacion.Activada
            : FechaRevocacionUtc is not null ? EstadoInvitacion.Revocada
            : ahoraUtc >= VenceUtc ? EstadoInvitacion.Vencida
            : EstadoInvitacion.Pendiente;

        /// <summary>Ni usada ni revocada (puede estar vencida): el administrador todavía puede actuar sobre ella.</summary>
        public bool EstaAbierta => FechaActivacionUtc is null && FechaRevocacionUtc is null;
    }
}
