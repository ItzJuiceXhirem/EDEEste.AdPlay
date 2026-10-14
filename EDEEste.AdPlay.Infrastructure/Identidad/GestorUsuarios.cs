using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Identidad
{
    /// <summary>
    /// Implementa <see cref="IGestorUsuarios"/> con ASP.NET Core Identity. Cada usuario tiene un único rol.
    /// </summary>
    public class GestorUsuarios : IGestorUsuarios
    {
        private readonly UserManager<UsuarioAplicacion> _usuarios;
        private readonly RoleManager<RolAplicacion> _roles;
        private readonly ContextoPublicidad _contexto;
        private readonly TimeProvider _reloj;

        public GestorUsuarios(
            UserManager<UsuarioAplicacion> usuarios,
            RoleManager<RolAplicacion> roles,
            ContextoPublicidad contexto,
            TimeProvider reloj)
        {
            _usuarios = usuarios;
            _roles = roles;
            _contexto = contexto;
            _reloj = reloj;
        }

        public async Task<ValidacionCredenciales> ValidarCredencialesAsync(string correo, string clave, CancellationToken ct = default)
        {
            var usuario = await _usuarios.FindByEmailAsync(correo);
            if (usuario is null)
            {
                // Se verifica contra una clave inexistente para que el tiempo de respuesta no delate si la cuenta existe.
                _usuarios.PasswordHasher.HashPassword(new UsuarioAplicacion(), clave);
                return new ValidacionCredenciales(ResultadoCredenciales.Invalido, null);
            }

            if (await _usuarios.IsLockedOutAsync(usuario))
            {
                return new ValidacionCredenciales(ResultadoCredenciales.Bloqueado, null);
            }

            if (!await _usuarios.CheckPasswordAsync(usuario, clave))
            {
                await _usuarios.AccessFailedAsync(usuario);
                var ahoraBloqueado = await _usuarios.IsLockedOutAsync(usuario);
                return new ValidacionCredenciales(
                    ahoraBloqueado ? ResultadoCredenciales.Bloqueado : ResultadoCredenciales.Invalido,
                    null);
            }

            await _usuarios.ResetAccessFailedCountAsync(usuario);
            var info = await ConstruirInfoAsync(usuario);
            return new ValidacionCredenciales(
                usuario.EstaActivo ? ResultadoCredenciales.Correcto : ResultadoCredenciales.Inactivo,
                usuario.EstaActivo ? info : null);
        }

        public async Task<UsuarioInfo?> ObtenerAsync(int id, CancellationToken ct = default)
        {
            var usuario = await _usuarios.FindByIdAsync(id.ToString());
            return usuario is null ? null : await ConstruirInfoAsync(usuario);
        }

        public async Task<IReadOnlyList<UsuarioInfo>> ListarAsync(CancellationToken ct = default)
        {
            var filas = await (
                from u in _contexto.Users.AsNoTracking()
                join ur in _contexto.UserRoles on u.Id equals ur.UserId into rolesDeUsuario
                from ur in rolesDeUsuario.DefaultIfEmpty()
                join r in _contexto.Roles on ur.RoleId equals r.Id into roles
                from r in roles.DefaultIfEmpty()
                orderby u.NombreCompleto
                select new { Usuario = u, Rol = r.Name })
                .ToListAsync(ct);

            return filas.Select(f => ADto(f.Usuario, f.Rol ?? string.Empty)).ToList();
        }

        public async Task<bool> ExisteCorreoAsync(string correo, CancellationToken ct = default) =>
            await _usuarios.FindByEmailAsync(correo) is not null;

        public Task<bool> ExistenUsuariosAsync(CancellationToken ct = default) =>
            _contexto.Users.AnyAsync(ct);

        public async Task<int> ContarAdministradoresActivosAsync(CancellationToken ct = default) =>
            await (
                from u in _contexto.Users
                join ur in _contexto.UserRoles on u.Id equals ur.UserId
                join r in _contexto.Roles on ur.RoleId equals r.Id
                where u.EstaActivo && r.Name == RolesSistema.Administrador
                select u.Id)
                .CountAsync(ct);

        public async Task<UsuarioInfo> CrearAsync(string correo, string nombreCompleto, string rol, string clave, CancellationToken ct = default)
        {
            var usuario = new UsuarioAplicacion
            {
                UserName = correo,
                Email = correo,
                EmailConfirmed = true,
                NombreCompleto = nombreCompleto,
                EstaActivo = true,
                FechaCreacionUtc = _reloj.GetUtcNow().UtcDateTime
            };

            // Garantiza que el rol exista aunque aún no se haya ejecutado la inicialización de seguridad.
            if (!await _roles.RoleExistsAsync(rol))
            {
                LanzarSiHayErrores(await _roles.CreateAsync(new RolAplicacion(rol)));
            }

            LanzarSiHayErrores(await _usuarios.CreateAsync(usuario, clave));

            var asignacion = await _usuarios.AddToRoleAsync(usuario, rol);
            if (!asignacion.Succeeded)
            {
                // Sin rol la cuenta no sirve: se revierte para no dejar usuarios a medias.
                await _usuarios.DeleteAsync(usuario);
                LanzarSiHayErrores(asignacion);
            }

            return ADto(usuario, rol);
        }

        public async Task ActualizarAsync(int id, string nombreCompleto, string rol, bool estaActivo, CancellationToken ct = default)
        {
            var usuario = await ObtenerEntidadAsync(id);
            var rolActual = (await _usuarios.GetRolesAsync(usuario)).FirstOrDefault();

            usuario.NombreCompleto = nombreCompleto;
            usuario.EstaActivo = estaActivo;
            LanzarSiHayErrores(await _usuarios.UpdateAsync(usuario));

            if (rolActual != rol)
            {
                if (rolActual is not null)
                {
                    LanzarSiHayErrores(await _usuarios.RemoveFromRoleAsync(usuario, rolActual));
                }

                LanzarSiHayErrores(await _usuarios.AddToRoleAsync(usuario, rol));
            }
        }

        public async Task RestablecerClaveAsync(int id, string nuevaClave, CancellationToken ct = default)
        {
            var usuario = await ObtenerEntidadAsync(id);
            if (await _usuarios.HasPasswordAsync(usuario))
            {
                LanzarSiHayErrores(await _usuarios.RemovePasswordAsync(usuario));
            }

            LanzarSiHayErrores(await _usuarios.AddPasswordAsync(usuario, nuevaClave));

            // El administrador la restablece, así que además se levanta cualquier bloqueo por intentos fallidos.
            await _usuarios.SetLockoutEndDateAsync(usuario, null);
            await _usuarios.ResetAccessFailedCountAsync(usuario);
        }

        public async Task<bool> CambiarClaveAsync(int id, string claveActual, string nuevaClave, CancellationToken ct = default)
        {
            var usuario = await ObtenerEntidadAsync(id);
            var resultado = await _usuarios.ChangePasswordAsync(usuario, claveActual, nuevaClave);
            if (resultado.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.PasswordMismatch)))
            {
                return false;
            }

            LanzarSiHayErrores(resultado);
            return true;
        }

        public async Task<IReadOnlyDictionary<int, string>> ObtenerNombresAsync(IEnumerable<int> ids, CancellationToken ct = default)
        {
            var lista = ids.Distinct().ToList();
            if (lista.Count == 0)
            {
                return new Dictionary<int, string>();
            }

            return await _contexto.Users.AsNoTracking()
                .Where(u => lista.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.NombreCompleto != "" ? u.NombreCompleto : u.Email!, ct);
        }

        public async Task<FotoPerfil?> ObtenerFotoAsync(int id, CancellationToken ct = default)
        {
            var foto = await _contexto.Users.AsNoTracking()
                .Where(u => u.Id == id && u.FotoClaveAlmacenamiento != null)
                .Select(u => new { u.FotoClaveAlmacenamiento, u.FotoTipoMime, u.FotoActualizadaUtc })
                .FirstOrDefaultAsync(ct);
            return foto is null ? null : new FotoPerfil(foto.FotoClaveAlmacenamiento!, foto.FotoTipoMime!, foto.FotoActualizadaUtc!.Value);
        }

        public async Task<FotoPerfil?> ReemplazarFotoAsync(int id, FotoPerfil? nueva, CancellationToken ct = default)
        {
            var usuario = await ObtenerEntidadAsync(id);
            var anterior = usuario.FotoClaveAlmacenamiento is null
                ? null
                : new FotoPerfil(usuario.FotoClaveAlmacenamiento, usuario.FotoTipoMime!, usuario.FotoActualizadaUtc!.Value);

            usuario.FotoClaveAlmacenamiento = nueva?.ClaveAlmacenamiento;
            usuario.FotoTipoMime = nueva?.TipoMime;
            usuario.FotoActualizadaUtc = nueva?.ActualizadaUtc;
            LanzarSiHayErrores(await _usuarios.UpdateAsync(usuario));
            return anterior;
        }

        private async Task<UsuarioAplicacion> ObtenerEntidadAsync(int id) =>
            await _usuarios.FindByIdAsync(id.ToString()) ?? throw new ExcepcionNoEncontrado("el usuario", id);

        private async Task<UsuarioInfo> ConstruirInfoAsync(UsuarioAplicacion usuario) =>
            ADto(usuario, (await _usuarios.GetRolesAsync(usuario)).FirstOrDefault() ?? string.Empty);

        private static UsuarioInfo ADto(UsuarioAplicacion usuario, string rol) =>
            new(
                usuario.Id,
                usuario.Email ?? string.Empty,
                usuario.NombreCompleto,
                rol,
                usuario.EstaActivo,
                usuario.FechaCreacionUtc,
                usuario.FotoClaveAlmacenamiento is null ? null : usuario.FotoActualizadaUtc);

        private static void LanzarSiHayErrores(IdentityResult resultado)
        {
            if (resultado.Succeeded)
            {
                return;
            }

            var errores = resultado.Errors
                .GroupBy(e => CampoDe(e.Code))
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());
            throw new ExcepcionValidacion(errores);
        }

        private static string CampoDe(string codigo) => codigo switch
        {
            nameof(IdentityErrorDescriber.DuplicateEmail)
                or nameof(IdentityErrorDescriber.DuplicateUserName)
                or nameof(IdentityErrorDescriber.InvalidEmail)
                or nameof(IdentityErrorDescriber.InvalidUserName) => "Correo",
            _ when codigo.StartsWith("Password", StringComparison.Ordinal) => "Clave",
            _ => "Usuario"
        };
    }
}
