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
    /// Administración de usuarios. Protege que el sistema siempre conserve al menos un administrador activo.
    /// </summary>
    public class ServicioUsuarios
    {
        private const string TipoEntidadUsuario = "Usuario";

        private readonly IGestorUsuarios _gestor;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IUsuarioActual _usuarioActual;

        public ServicioUsuarios(
            IGestorUsuarios gestor,
            IRegistroAuditoria auditoria,
            IUnidadDeTrabajo unidadDeTrabajo,
            IUsuarioActual usuarioActual)
        {
            _gestor = gestor;
            _auditoria = auditoria;
            _unidadDeTrabajo = unidadDeTrabajo;
            _usuarioActual = usuarioActual;
        }

        public async Task<IReadOnlyList<UsuarioDto>> ListarAsync(CancellationToken ct = default) =>
            (await _gestor.ListarAsync(ct)).Select(ADto).ToList();

        public async Task<UsuarioDto> CrearAsync(CrearUsuarioDto dto, CancellationToken ct = default)
        {
            var errores = new ErroresValidacion();
            ValidadorUsuarios.Correo(errores, nameof(dto.Correo), dto.Correo);
            ValidadorUsuarios.Nombre(errores, nameof(dto.NombreCompleto), dto.NombreCompleto);
            ValidadorUsuarios.Rol(errores, nameof(dto.Rol), dto.Rol);
            ValidadorUsuarios.Clave(errores, nameof(dto.Clave), dto.Clave);

            errores.LanzarSiHayErrores();

            var usuario = await _gestor.CrearAsync(dto.Correo.Trim(), dto.NombreCompleto.Trim(), dto.Rol, dto.Clave, ct);
            _auditoria.Registrar(AccionAuditoria.Crear, TipoEntidadUsuario, usuario.Id, $"Usuario {usuario.Correo} con rol {usuario.Rol}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            return ADto(usuario);
        }

        public async Task<UsuarioDto> ActualizarAsync(int id, ActualizarUsuarioDto dto, CancellationToken ct = default)
        {
            var errores = new ErroresValidacion();
            ValidadorUsuarios.Nombre(errores, nameof(dto.NombreCompleto), dto.NombreCompleto);
            ValidadorUsuarios.Rol(errores, nameof(dto.Rol), dto.Rol);
            errores.LanzarSiHayErrores();

            var actual = await _gestor.ObtenerAsync(id, ct) ?? throw new ExcepcionNoEncontrado("el usuario", id);
            await VerificarQueNoSeDejeSinAdministradorAsync(actual, dto, ct);

            await _gestor.ActualizarAsync(id, dto.NombreCompleto.Trim(), dto.Rol, dto.EstaActivo, ct);

            var accion = actual.EstaActivo == dto.EstaActivo
                ? AccionAuditoria.Editar
                : dto.EstaActivo ? AccionAuditoria.Habilitar : AccionAuditoria.Deshabilitar;
            _auditoria.Registrar(accion, TipoEntidadUsuario, id, $"Usuario {actual.Correo}, rol {dto.Rol}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);

            return ADto((await _gestor.ObtenerAsync(id, ct))!);
        }

        public async Task RestablecerClaveAsync(int id, RestablecerClaveDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrEmpty(dto.NuevaClave))
            {
                throw new ExcepcionValidacion(nameof(dto.NuevaClave), "Es obligatoria.");
            }

            var usuario = await _gestor.ObtenerAsync(id, ct) ?? throw new ExcepcionNoEncontrado("el usuario", id);
            await _gestor.RestablecerClaveAsync(id, dto.NuevaClave, ct);

            _auditoria.Registrar(AccionAuditoria.RestablecerClave, TipoEntidadUsuario, id, $"Usuario {usuario.Correo}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
        }

        /// <summary>El propio usuario cambia su clave.</summary>
        public async Task CambiarClaveAsync(CambiarClaveDto dto, CancellationToken ct = default)
        {
            var id = _usuarioActual.Id ?? throw new ExcepcionNoAutorizado("Debe iniciar sesión.");
            if (string.IsNullOrEmpty(dto.NuevaClave))
            {
                throw new ExcepcionValidacion(nameof(dto.NuevaClave), "Es obligatoria.");
            }

            if (!await _gestor.CambiarClaveAsync(id, dto.ClaveActual, dto.NuevaClave, ct))
            {
                throw new ExcepcionValidacion(nameof(dto.ClaveActual), "La contraseña actual no es correcta.");
            }

            _auditoria.Registrar(AccionAuditoria.CambiarClave, TipoEntidadUsuario, id);
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
        }

        private async Task VerificarQueNoSeDejeSinAdministradorAsync(UsuarioInfo actual, ActualizarUsuarioDto dto, CancellationToken ct)
        {
            if (actual.Id == _usuarioActual.Id && !dto.EstaActivo)
            {
                throw new ExcepcionConflicto("No puede desactivar su propia cuenta.");
            }

            var dejaDeSerAdministradorActivo = actual is { Rol: RolesSistema.Administrador, EstaActivo: true }
                && (dto.Rol != RolesSistema.Administrador || !dto.EstaActivo);
            if (dejaDeSerAdministradorActivo && await _gestor.ContarAdministradoresActivosAsync(ct) <= 1)
            {
                throw new ExcepcionConflicto("Debe existir al menos un administrador activo.");
            }
        }

        private static UsuarioDto ADto(UsuarioInfo u) =>
            new(u.Id, u.Correo, u.NombreCompleto, u.Rol, u.EstaActivo, u.FechaCreacionUtc);
    }
}
