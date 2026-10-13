import type { ReactNode } from 'react'

export function AvisoError({ mensaje }: { mensaje: string | null | undefined }) {
  return mensaje ? <div className="aviso error" role="alert">{mensaje}</div> : null
}

export function Cargando({ activo, children }: { activo: boolean; children: ReactNode }) {
  return activo ? <p className="suave">Cargando…</p> : <>{children}</>
}

export function Insignia({ tono, children }: { tono?: 'exito' | 'peligro' | 'aviso'; children: ReactNode }) {
  return <span className={`insignia ${tono ?? ''}`}>{children}</span>
}
