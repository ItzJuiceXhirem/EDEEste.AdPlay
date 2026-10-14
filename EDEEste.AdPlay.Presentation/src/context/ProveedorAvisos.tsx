import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icono } from '../components/Icono'
import { AvisosContexto, type OpcionesAviso } from './avisosContexto'

const DURACION_MS = 3200
const DURACION_ERROR_MS = 6000

interface Aviso {
  id: number
  texto: string
  error: boolean
}

/** Muestra un aviso flotante a la vez, abajo a la derecha, que se oculta solo. */
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const siguienteId = useRef(0)

  const avisar = useCallback((texto: string, opciones: OpcionesAviso = {}) => {
    siguienteId.current += 1
    setAviso({ id: siguienteId.current, texto, error: opciones.error ?? false })
  }, [])

  useEffect(() => {
    if (!aviso) {
      return
    }
    const espera = window.setTimeout(() => setAviso(null), aviso.error ? DURACION_ERROR_MS : DURACION_MS)
    return () => window.clearTimeout(espera)
  }, [aviso])

  return (
    <AvisosContexto.Provider value={avisar}>
      {children}
      {aviso && (
        <div
          key={aviso.id}
          className={`aviso-flotante${aviso.error ? ' error' : ''}`}
          role={aviso.error ? 'alert' : 'status'}
        >
          <Icono nombre={aviso.error ? 'alerta' : 'marca'} grosor={aviso.error ? 2.2 : 2.4} style={{ marginTop: 0 }} />
          <span>{aviso.texto}</span>
        </div>
      )}
    </AvisosContexto.Provider>
  )
}
