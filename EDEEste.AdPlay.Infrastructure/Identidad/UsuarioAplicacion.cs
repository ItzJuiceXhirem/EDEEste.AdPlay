using Microsoft.AspNetCore.Identity;

namespace EDEEste.AdPlay.Infrastructure.Identidad
{
    /// <summary>
    /// Usuario de la aplicación. Vive en Infrastructure para que el Dominio no dependa de Identity;
    /// el resto de la solución lo ve a través de IGestorUsuarios.
    /// </summary>
    public class UsuarioAplicacion : IdentityUser<int>
    {
        public string NombreCompleto { get; set; } = string.Empty;

        /// <summary>Los usuarios no se eliminan (la auditoría los referencia): se desactivan.</summary>
        public bool EstaActivo { get; set; } = true;

        public DateTime FechaCreacionUtc { get; set; }

        /// <summary>Clave de la foto de perfil en el almacenamiento de medios; nula si no tiene.</summary>
        public string? FotoClaveAlmacenamiento { get; set; }

        public string? FotoTipoMime { get; set; }
        public DateTime? FotoActualizadaUtc { get; set; }
    }
}
