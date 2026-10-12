using EDEEste.AdPlay.Application.Comunes;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.CasosDeUso.Usuarios
{
    /// <summary>
    /// Inicio de sesión. Emitir y renovar el token de sesión es responsabilidad de la API; aquí solo se
    /// comprueban las credenciales y se deja constancia en la auditoría.
    /// </summary>
    public class ServicioAutenticacion
    {
        private const string TipoEntidadUsuario = "Usuario";

        // Evita que dos registros iniciales simultáneos creen dos administradores (la API corre en un solo proceso).
        private static readonly SemaphoreSlim BloqueoRegistroInicial = new(1, 1);

        private readonly IGestorUsuarios _gestor;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;

        public ServicioAutenticacion(IGestorUsuarios gestor, IRegistroAuditoria auditoria, IUnidadDeTrabajo unidadDeTrabajo)
        {
            _gestor = gestor;
            _auditoria = auditoria;
            _unidadDeTrabajo = unidadDeTrabajo;
        }

        /// <exception cref="ExcepcionNoAutorizado">Credenciales no válidas, cuenta inactiva o bloqueada.</exception>
        public async Task<SesionDto> IniciarSesionAsync(CredencialesDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Correo) || string.IsNullOrEmpty(dto.Clave))
            {
                throw new ExcepcionValidacion(nameof(dto.Correo), "Indique el correo y la contraseña.");
            }

            var validacion = await _gestor.ValidarCredencialesAsync(dto.Correo.Trim(), dto.Clave, ct);
            var correo = dto.Correo.Trim().Recortar(LongitudesMaximas.Correo);

            if (validacion is { Resultado: ResultadoCredenciales.Correcto, Usuario: { } usuario })
            {
                _auditoria.Registrar(AccionAuditoria.IniciarSesion, TipoEntidadUsuario, usuario.Id, usuarioId: usuario.Id);
                await _unidadDeTrabajo.GuardarCambiosAsync(ct);
                return new SesionDto(usuario.Id, usuario.Correo, usuario.NombreCompleto, usuario.Rol);
            }

            _auditoria.Registrar(
                AccionAuditoria.InicioSesionFallido,
                TipoEntidadUsuario,
                validacion.Usuario?.Id,
                $"Correo: {correo} ({validacion.Resultado})");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);

            // El mismo mensaje para "no existe", "clave incorrecta" e "inactiva" evita revelar qué cuentas existen.
            throw new ExcepcionNoAutorizado(validacion.Resultado == ResultadoCredenciales.Bloqueado
                ? "Demasiados intentos fallidos. Espere unos minutos e intente de nuevo."
                : "Correo o contraseña incorrectos.");
        }

        /// <summary>El registro inicial solo está disponible mientras el sistema no tenga ningún usuario.</summary>
        public async Task<bool> RegistroInicialDisponibleAsync(CancellationToken ct = default) =>
            !await _gestor.ExistenUsuariosAsync(ct);

        /// <summary>
        /// Crea al primer administrador. Después de que exista cualquier usuario, el registro se cierra: las demás
        /// cuentas las crea un administrador desde el panel.
        /// </summary>
        /// <exception cref="ExcepcionConflicto">Ya existe al menos un usuario.</exception>
        public async Task<SesionDto> RegistrarAdministradorInicialAsync(RegistroInicialDto dto, CancellationToken ct = default)
        {
            var errores = new ErroresValidacion();
            ValidadorUsuarios.Correo(errores, nameof(dto.Correo), dto.Correo);
            ValidadorUsuarios.Nombre(errores, nameof(dto.NombreCompleto), dto.NombreCompleto);
            ValidadorUsuarios.Clave(errores, nameof(dto.Clave), dto.Clave);
            errores.LanzarSiHayErrores();

            await BloqueoRegistroInicial.WaitAsync(ct);
            try
            {
                if (await _gestor.ExistenUsuariosAsync(ct))
                {
                    throw new ExcepcionConflicto("El registro inicial ya no está disponible: el sistema ya tiene usuarios. Inicie sesión.");
                }

                var usuario = await _gestor.CrearAsync(
                    dto.Correo.Trim(), dto.NombreCompleto.Trim(), RolesSistema.Administrador, dto.Clave, ct);

                _auditoria.Registrar(
                    AccionAuditoria.Crear, TipoEntidadUsuario, usuario.Id, "Registro inicial del primer administrador", usuario.Id);
                await _unidadDeTrabajo.GuardarCambiosAsync(ct);
                return new SesionDto(usuario.Id, usuario.Correo, usuario.NombreCompleto, usuario.Rol);
            }
            finally
            {
                BloqueoRegistroInicial.Release();
            }
        }

        /// <summary>Devuelve la sesión del usuario si existe y sigue activo; se usa al renovar el token.</summary>
        public async Task<SesionDto?> ObtenerSesionAsync(int usuarioId, CancellationToken ct = default)
        {
            var usuario = await _gestor.ObtenerAsync(usuarioId, ct);
            return usuario is { EstaActivo: true }
                ? new SesionDto(usuario.Id, usuario.Correo, usuario.NombreCompleto, usuario.Rol)
                : null;
        }
    }
}
