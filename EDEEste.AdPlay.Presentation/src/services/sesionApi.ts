import type { ActualizarUsuario, CrearUsuario, RespuestaTokens, Sesion, Usuario } from '../types/api'
import { api, solicitar } from './clienteApi'

export const sesionApi = {
  iniciarSesion: (correo: string, clave: string) =>
    api.post<RespuestaTokens>('/auth/iniciar-sesion', { correo, clave }, { conSesion: false }),
  obtenerSesion: () => api.get<Sesion>('/auth/sesion'),
  /** Verdadero mientras el sistema no tiene ningún usuario. */
  registroInicialDisponible: () =>
    api.get<{ disponible: boolean }>('/auth/registro-inicial', { conSesion: false }).then((r) => r.disponible),
  registrarAdministradorInicial: (correo: string, nombreCompleto: string, clave: string) =>
    api.post<RespuestaTokens>('/auth/registro-inicial', { correo, nombreCompleto, clave }, { conSesion: false }),
  cambiarClave: (claveActual: string, nuevaClave: string) =>
    api.post<void>('/auth/cambiar-clave', { claveActual, nuevaClave }),
  /** Reemplaza la foto de perfil de la persona con sesión; devuelve la nueva versión. */
  cambiarFoto: (archivo: Blob, nombre: string) => {
    const formulario = new FormData()
    formulario.append('archivo', archivo, nombre)
    return solicitar<{ fotoVersion: string }>('/auth/foto', { method: 'PUT', body: formulario }).then((r) => r.fotoVersion)
  },
  quitarFoto: () => api.delete('/auth/foto'),
}

export const usuariosApi = {
  listar: () => api.get<Usuario[]>('/usuarios'),
  crear: (dto: CrearUsuario) => api.post<Usuario>('/usuarios', dto),
  actualizar: (id: number, dto: ActualizarUsuario) => api.put<Usuario>(`/usuarios/${id}`, dto),
  restablecerClave: (id: number, nuevaClave: string) =>
    api.post<void>(`/usuarios/${id}/restablecer-clave`, { nuevaClave }),
  /** Ruta de la foto; la versión va en la consulta para que el navegador pueda guardarla en caché sin riesgo. */
  rutaFoto: (id: number, version: string) => `/usuarios/${id}/foto?v=${encodeURIComponent(version)}`,
}
