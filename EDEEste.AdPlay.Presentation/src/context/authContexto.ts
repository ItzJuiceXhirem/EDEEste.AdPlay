import { createContext } from 'react'
import type { Sesion } from '../types/api'

export interface ValorAuth {
  /** Usuario con sesión iniciada; nulo si no la hay. */
  sesion: Sesion | null
  /** Verdadero mientras se comprueba una sesión guardada al abrir la aplicación. */
  cargando: boolean
  esAdministrador: boolean
  iniciarSesion: (correo: string, clave: string) => Promise<void>
  /** Crea al primer administrador y deja la sesión iniciada. Solo funciona mientras no haya usuarios. */
  registrarAdministradorInicial: (correo: string, nombreCompleto: string, clave: string) => Promise<void>
  cerrarSesion: () => void
  /** Vuelve a leer la sesión (por ejemplo, tras cambiar la foto de perfil). */
  refrescarSesion: () => Promise<void>
}

export const AuthContexto = createContext<ValorAuth | null>(null)
