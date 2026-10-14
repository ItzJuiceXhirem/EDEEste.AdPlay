import { createContext } from 'react'

export interface OpcionesAviso {
  /** Muestra el aviso en rojo (un error que no tiene lugar en el formulario). */
  error?: boolean
}

export type Avisar = (texto: string, opciones?: OpcionesAviso) => void

export const AvisosContexto = createContext<Avisar | null>(null)
