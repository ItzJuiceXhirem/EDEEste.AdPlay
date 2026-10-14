using EDEEste.AdPlay.Application.CasosDeUso.Pantallas;
using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.CasosDeUso.Usuarios
{
    /// <summary>
    /// Invitaciones para que cada persona active su propia cuenta y elija su contraseña. El administrador decide el
    /// correo y el rol; el enlace se entrega una sola vez, vence a los <see cref="DiasVigencia"/> días y sirve una vez.
    /// </summary>
    public class ServicioInvitaciones
    {
        public const int DiasVigencia = 7;

        private const string TipoEntidadUsuario = "Usuario";
        private const string MensajeNoValida = "La invitación no es válida: venció, ya se usó o fue anulada. Pida una nueva a un administrador.";

        // Evita que dos activaciones simultáneas del mismo enlace creen dos cuentas (la API corre en un solo proceso).
        private static readonly SemaphoreSlim BloqueoActivacion = new(1, 1);

        private readonly IRepositorioInvitaciones _invitaciones;
        private readonly IGestorUsuarios _gestor;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IUsuarioActual _usuarioActual;
        private readonly TimeProvider _reloj;

        public ServicioInvitaciones(
            IRepositorioInvitaciones invitaciones,
            IGestorUsuarios gestor,
            IRegistroAuditoria auditoria,
            IUnidadDeTrabajo unidadDeTrabajo,
            IUsuarioActual usuarioActual,
            TimeProvider reloj)
        {
            _invitaciones = invitaciones;
            _gestor = gestor;
            _auditoria = auditoria;
            _unidadDeTrabajo = unidadDeTrabajo;
            _usuarioActual = usuarioActual;
            _reloj = reloj;
        }

        private DateTime Ahora => _reloj.GetUtcNow().UtcDateTime;

        /// <summary>Invitaciones sin usar ni anular, incluidas las vencidas (para volver a enviarlas).</summary>
        public async Task<IReadOnlyList<InvitacionDto>> ListarAsync(CancellationToken ct = default)
        {
            var invitaciones = await _invitaciones.ListarAbiertasAsync(ct);
            var nombres = await _gestor.ObtenerNombresAsync(
                invitaciones.Where(i => i.UsuarioCreadorId is not null).Select(i => i.UsuarioCreadorId!.Value).Distinct(), ct);
            var ahora = Ahora;
            return invitaciones
                .Select(i => ADto(i, i.UsuarioCreadorId is { } id ? nombres.GetValueOrDefault(id) : null, ahora))
                .ToList();
        }

        /// <summary>Crea la invitación y anula las anteriores al mismo correo, cuyo enlace deja de servir.</summary>
        /// <exception cref="ExcepcionConflicto">Ya existe una cuenta con ese correo.</exception>
        public async Task<InvitacionCreadaDto> CrearAsync(CrearInvitacionDto dto, CancellationToken ct = default)
        {
            var errores = new ErroresValidacion();
            ValidadorUsuarios.Correo(errores, nameof(dto.Correo), dto.Correo);
            ValidadorUsuarios.Nombre(errores, nameof(dto.NombreCompleto), dto.NombreCompleto);
            ValidadorUsuarios.Rol(errores, nameof(dto.Rol), dto.Rol);
            errores.LanzarSiHayErrores();

            var correo = dto.Correo.Trim();
            if (await _gestor.ExisteCorreoAsync(correo, ct))
            {
                throw new ExcepcionConflicto($"Ya existe una cuenta con el correo {correo}.");
            }

            var ahora = Ahora;
            foreach (var anterior in await _invitaciones.ListarAbiertasPorCorreoAsync(correo, ct))
            {
                anterior.FechaRevocacionUtc = ahora;
            }

            var token = TokensDispositivo.Generar();
            var invitacion = new Invitacion
            {
                Correo = correo,
                NombreCompleto = dto.NombreCompleto.Trim(),
                Rol = dto.Rol,
                TokenHash = TokensDispositivo.CalcularHash(token),
                FechaCreacionUtc = ahora,
                VenceUtc = ahora.AddDays(DiasVigencia),
                UsuarioCreadorId = _usuarioActual.Id
            };
            _invitaciones.Agregar(invitacion);
            _auditoria.Registrar(AccionAuditoria.Invitar, invitacion, $"Invitación a {correo} como {dto.Rol}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);

            return new InvitacionCreadaDto(ADto(invitacion, _usuarioActual.Nombre, ahora), token);
        }

        /// <exception cref="ExcepcionConflicto">Ya se usó o ya estaba anulada.</exception>
        public async Task RevocarAsync(int id, CancellationToken ct = default)
        {
            var invitacion = await _invitaciones.ObtenerPorIdAsync(id, ct) ?? throw new ExcepcionNoEncontrado("la invitación", id);
            if (!invitacion.EstaAbierta)
            {
                throw new ExcepcionConflicto("La invitación ya se usó o ya estaba anulada.");
            }

            invitacion.FechaRevocacionUtc = Ahora;
            _auditoria.Registrar(AccionAuditoria.RevocarInvitacion, invitacion, $"Invitación a {invitacion.Correo}");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
        }

        /// <summary>Datos que ve la persona invitada al abrir el enlace.</summary>
        /// <exception cref="ExcepcionNoEncontrado">El enlace no existe, venció, ya se usó o fue anulado.</exception>
        public async Task<InvitacionPublicaDto> ConsultarAsync(ConsultarInvitacionDto dto, CancellationToken ct = default)
        {
            var invitacion = await ObtenerVigenteAsync(dto.Token, ct);
            var invitador = invitacion.UsuarioCreadorId is { } id
                ? (await _gestor.ObtenerNombresAsync([id], ct)).GetValueOrDefault(id)
                : null;
            return new InvitacionPublicaDto(invitacion.Correo, invitacion.NombreCompleto, invitacion.Rol, invitador, invitacion.VenceUtc);
        }

        /// <summary>Crea la cuenta con el correo y el rol de la invitación y la contraseña que eligió la persona.</summary>
        /// <exception cref="ExcepcionNoEncontrado">El enlace no existe, venció, ya se usó o fue anulado.</exception>
        /// <exception cref="ExcepcionConflicto">Mientras tanto se creó otra cuenta con ese correo.</exception>
        public async Task<SesionDto> ActivarAsync(ActivarCuentaDto dto, CancellationToken ct = default)
        {
            var errores = new ErroresValidacion();
            ValidadorUsuarios.Nombre(errores, nameof(dto.NombreCompleto), dto.NombreCompleto);
            ValidadorUsuarios.Clave(errores, nameof(dto.Clave), dto.Clave);
            errores.LanzarSiHayErrores();

            await BloqueoActivacion.WaitAsync(ct);
            try
            {
                var invitacion = await ObtenerVigenteAsync(dto.Token, ct);
                if (await _gestor.ExisteCorreoAsync(invitacion.Correo, ct))
                {
                    throw new ExcepcionConflicto("Ya existe una cuenta con este correo. Inicie sesión.");
                }

                // La política de contraseñas la aplica Identity; si no la cumple, lanza ExcepcionValidacion y la
                // invitación sigue disponible para intentarlo de nuevo.
                var usuario = await _gestor.CrearAsync(invitacion.Correo, dto.NombreCompleto.Trim(), invitacion.Rol, dto.Clave, ct);

                invitacion.FechaActivacionUtc = Ahora;
                invitacion.UsuarioActivadoId = usuario.Id;
                _auditoria.Registrar(
                    AccionAuditoria.ActivarCuenta, TipoEntidadUsuario, usuario.Id, $"Cuenta {usuario.Correo} activada con una invitación como {usuario.Rol}", usuario.Id);
                await _unidadDeTrabajo.GuardarCambiosAsync(ct);
                return usuario.ASesionDto();
            }
            finally
            {
                BloqueoActivacion.Release();
            }
        }

        private async Task<Invitacion> ObtenerVigenteAsync(string? token, CancellationToken ct)
        {
            var invitacion = string.IsNullOrWhiteSpace(token)
                ? null
                : await _invitaciones.ObtenerPorTokenHashAsync(TokensDispositivo.CalcularHash(token.Trim()), ct);
            return invitacion?.EstadoEn(Ahora) == EstadoInvitacion.Pendiente
                ? invitacion
                : throw new ExcepcionNoEncontrado(MensajeNoValida);
        }

        private static InvitacionDto ADto(Invitacion i, string? invitador, DateTime ahora) =>
            new(i.Id, i.Correo, i.NombreCompleto, i.Rol, i.EstadoEn(ahora), i.FechaCreacionUtc, i.VenceUtc, invitador);
    }
}
