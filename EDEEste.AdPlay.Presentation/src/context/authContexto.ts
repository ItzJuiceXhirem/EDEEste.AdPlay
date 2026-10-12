import { createContext } from 'react'
import type { Sesion } from '../types/api'

export interface ValorAuth {
  /** Usuario con sesión iniciada; nulo si no la hay. */
  sesion: Sesion | null
  /** Verdadero mientras se comprueba una sesión guardada al abrir la aplicación. */
  cargando: boolean
  esAdministrador: boolean
  iniciarSesion: (correo: string, clave: string) => Promise<void>
  cerrarSesion: () => void
}

export const AuthContexto = createContext<ValorAuth | null>(null)
