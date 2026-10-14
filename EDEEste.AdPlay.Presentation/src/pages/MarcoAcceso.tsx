import type { ReactNode } from 'react'
import logoEdeesteBlanco from '../assets/logos/edeeste-blanco.png'
import { Icono } from '../components/Icono'
import { useTema } from '../hooks/useTema'
import './acceso.css'

/** Fondo animado, píldoras superiores, logo de EDEEste y pie compartidos por el inicio de sesión y el registro. */
export function MarcoAcceso({
  registro,
  pildoraDerecha,
  children,
}: {
  registro?: boolean
  pildoraDerecha: ReactNode
  children: ReactNode
}) {
  const { oscuro, fijarTema } = useTema()
  const textoTema = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <div className={`acceso${registro ? ' registro' : ''}`}>
      <div className="capa capa-clara" aria-hidden="true" />
      <div className="capa capa-oscura" aria-hidden="true" />
      <div className="mancha mancha-1" aria-hidden="true" />
      <div className="mancha mancha-2" aria-hidden="true" />
      <div className="mancha mancha-3" aria-hidden="true" />

      <header className="acceso-cabecera">
        <div className="pildora">
          <span className="punto" aria-hidden="true">
            <span className="punto-onda" style={{ background: '#2fb37f', opacity: 0.6 }} />
            <span className="punto-centro" style={{ background: '#07885d' }} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.02em', color: 'var(--titulo)' }}>EDEEste AdPlay</span>
          <span className="solo-ancho" style={{ fontSize: 12, color: 'var(--pizarra)' }}>
            • Señalización digital
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pildoraDerecha}
          <button
            className="pildora boton-tema-acceso"
            type="button"
            onClick={() => fijarTema(oscuro ? 'claro' : 'oscuro')}
            aria-label={textoTema}
            title={textoTema}
          >
            <Icono nombre={oscuro ? 'sol' : 'luna'} tamano={20} />
          </button>
        </div>
      </header>

      <main className="acceso-principal">
        <div className="paso" style={{ display: 'flex', justifyContent: 'center', marginBottom: registro ? 20 : 22 }}>
          <img
            className="logo"
            src={logoEdeesteBlanco}
            alt="EDEEste"
            style={{ height: 40, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(60,20,28,.25))' }}
          />
        </div>
        {children}
      </main>

      <footer className="acceso-pie solo-ancho">
        <span>© Empresa Distribuidora de Electricidad del Este (EDEEste)</span>
        <span style={{ fontWeight: 700, opacity: 0.85 }}>AdPlay · Panel de administración</span>
      </footer>
    </div>
  )
}
