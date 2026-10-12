import type { RespuestaTokens } from '../types/api'

// Los tokens de sesión viven en sessionStorage: se descartan al cerrar la pestaña, lo que conviene en equipos
// compartidos de oficina. (No confundir con almacenReproductor, que guarda el token del dispositivo.)

const CLAVE_SESION = 'adplay.sesion'

export interface TokensSesion {
  accessToken: string
  refreshToken: string
}

export function guardarTokens(respuesta: RespuestaTokens): void {
  try {
    const tokens: TokensSesion = { accessToken: respuesta.accessToken, refreshToken: respuesta.refreshToken }
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(tokens))
  } catch {
    // Sin almacenamiento la sesión no sobrevive a una recarga; el usuario deberá iniciar sesión de nuevo.
  }
}

export function leerTokens(): TokensSesion | null {
  try {
    const texto = sessionStorage.getItem(CLAVE_SESION)
    return texto ? (JSON.parse(texto) as TokensSesion) : null
  } catch {
    return null
  }
}

export function limpiarTokens(): void {
  try {
    sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // Nada que limpiar.
  }
}

type Escucha = () => void
const escuchasExpiracion = new Set<Escucha>()

/** Avisa a la interfaz que la sesión ya no es válida (por ejemplo, el token de renovación venció). */
export function notificarSesionExpirada(): void {
  limpiarTokens()
  escuchasExpiracion.forEach((escucha) => escucha())
}

export function alExpirarSesion(escucha: Escucha): () => void {
  escuchasExpiracion.add(escucha)
  return () => escuchasExpiracion.delete(escucha)
}
