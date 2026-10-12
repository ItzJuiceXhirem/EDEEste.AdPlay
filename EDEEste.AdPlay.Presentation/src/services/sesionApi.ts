import type { ActualizarUsuario, CrearUsuario, RespuestaTokens, Sesion, Usuario } from '../types/api'
import { api } from './clienteApi'

export const sesionApi = {
  iniciarSesion: (correo: string, clave: string) =>
    api.post<RespuestaTokens>('/auth/iniciar-sesion', { correo, clave }, { conSesion: false }),
  obtenerSesion: () => api.get<Sesion>('/auth/sesion'),
  cambiarClave: (claveActual: string, nuevaClave: string) =>
    api.post<void>('/auth/cambiar-clave', { claveActual, nuevaClave }),
}

export const usuariosApi = {
  listar: () => api.get<Usuario[]>('/usuarios'),
  crear: (dto: CrearUsuario) => api.post<Usuario>('/usuarios', dto),
  actualizar: (id: number, dto: ActualizarUsuario) => api.put<Usuario>(`/usuarios/${id}`, dto),
  restablecerClave: (id: number, nuevaClave: string) =>
    api.post<void>(`/usuarios/${id}/restablecer-clave`, { nuevaClave }),
}
