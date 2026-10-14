using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Application.Opciones;
using EDEEste.AdPlay.Application.Validaciones;
using EDEEste.AdPlay.Domain.Enums;
using Microsoft.Extensions.Options;

namespace EDEEste.AdPlay.Application.CasosDeUso.Usuarios
{
    /// <summary>
    /// Foto de perfil: cada persona cambia o quita la suya; cualquier usuario con sesión puede verlas.
    /// </summary>
    public class ServicioFotoPerfil
    {
        private const string TipoEntidadUsuario = "Usuario";

        private readonly IGestorUsuarios _gestor;
        private readonly IAlmacenamientoMultimedia _almacenamiento;
        private readonly IRegistroAuditoria _auditoria;
        private readonly IUnidadDeTrabajo _unidadDeTrabajo;
        private readonly IUsuarioActual _usuarioActual;
        private readonly TimeProvider _reloj;
        private readonly OpcionesMultimedia _opciones;

        public ServicioFotoPerfil(
            IGestorUsuarios gestor,
            IAlmacenamientoMultimedia almacenamiento,
            IRegistroAuditoria auditoria,
            IUnidadDeTrabajo unidadDeTrabajo,
            IUsuarioActual usuarioActual,
            TimeProvider reloj,
            IOptions<OpcionesMultimedia> opciones)
        {
            _gestor = gestor;
            _almacenamiento = almacenamiento;
            _auditoria = auditoria;
            _unidadDeTrabajo = unidadDeTrabajo;
            _usuarioActual = usuarioActual;
            _reloj = reloj;
            _opciones = opciones.Value;
        }

        /// <summary>Valida la imagen, la guarda y la deja como foto del usuario con sesión.</summary>
        public async Task<FotoPerfilDto> CambiarAsync(CargarFotoPerfilDto dto, CancellationToken ct = default)
        {
            var usuarioId = UsuarioConSesion();
            if (!dto.Contenido.CanSeek)
            {
                throw new InvalidOperationException("El flujo de carga debe permitir Seek para verificar la firma de la imagen.");
            }

            var cabecera = new byte[ValidadorArchivosMultimedia.BytesCabecera];
            var leidos = await dto.Contenido.ReadAtLeastAsync(cabecera, cabecera.Length, throwOnEndOfStream: false, ct);
            dto.Contenido.Seek(0, SeekOrigin.Begin);

            var (tipoMime, extension) = ValidadorArchivosMultimedia.ValidarImagen(
                Path.GetFileName(dto.NombreOriginal ?? string.Empty),
                dto.TipoMime,
                dto.Longitud,
                cabecera.AsMemory(0, leidos),
                _opciones.TamanoMaximoFotoPerfilBytes);

            var clave = ClavesAlmacenamiento.ParaFotoPerfil(usuarioId, extension);
            await _almacenamiento.GuardarAsync(clave, dto.Contenido, ct);

            var nueva = new FotoPerfil(clave, tipoMime, _reloj.GetUtcNow().UtcDateTime);
            FotoPerfil? anterior;
            try
            {
                anterior = await _gestor.ReemplazarFotoAsync(usuarioId, nueva, ct);
                _auditoria.Registrar(AccionAuditoria.CambiarFoto, TipoEntidadUsuario, usuarioId, "Subió una foto de perfil");
                await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            }
            catch
            {
                await _almacenamiento.EliminarAsync(clave, CancellationToken.None);
                throw;
            }

            await EliminarArchivoAsync(anterior);
            return new FotoPerfilDto(Mapeos.VersionFoto(nueva.ActualizadaUtc)!);
        }

        /// <summary>Quita la foto del usuario con sesión; vuelven a mostrarse sus iniciales.</summary>
        public async Task QuitarAsync(CancellationToken ct = default)
        {
            var usuarioId = UsuarioConSesion();
            var anterior = await _gestor.ReemplazarFotoAsync(usuarioId, null, ct);
            if (anterior is null)
            {
                return;
            }

            _auditoria.Registrar(AccionAuditoria.CambiarFoto, TipoEntidadUsuario, usuarioId, "Quitó su foto de perfil");
            await _unidadDeTrabajo.GuardarCambiosAsync(ct);
            await EliminarArchivoAsync(anterior);
        }

        /// <summary>Contenido de la foto; su versión sirve de etiqueta para la caché del navegador.</summary>
        public async Task<ContenidoFotoPerfilDto> ObtenerAsync(int usuarioId, CancellationToken ct = default)
        {
            var foto = await _gestor.ObtenerFotoAsync(usuarioId, ct)
                ?? throw new ExcepcionNoEncontrado("la foto de perfil del usuario", usuarioId);
            var contenido = await _almacenamiento.AbrirLecturaAsync(foto.ClaveAlmacenamiento, ct);
            return new ContenidoFotoPerfilDto(contenido, foto.TipoMime, Mapeos.VersionFoto(foto.ActualizadaUtc)!);
        }

        private int UsuarioConSesion() => _usuarioActual.Id ?? throw new ExcepcionNoAutorizado("Debe iniciar sesión.");

        // El archivo anterior ya no lo referencia nadie; si no se puede borrar solo queda un huérfano, no se revierte el cambio.
        private async Task EliminarArchivoAsync(FotoPerfil? foto)
        {
            if (foto is null)
            {
                return;
            }

            try
            {
                await _almacenamiento.EliminarAsync(foto.ClaveAlmacenamiento, CancellationToken.None);
            }
            catch (IOException)
            {
            }
        }
    }
}
