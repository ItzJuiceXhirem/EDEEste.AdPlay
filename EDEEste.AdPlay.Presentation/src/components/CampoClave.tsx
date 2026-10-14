import { useId, useState, type ReactNode } from 'react'
import { generarClave } from '../utils/clave'
import { FortalezaClave } from './FortalezaClave'
import { Icono } from './Icono'

interface Props {
  etiqueta: string
  valor: string
  alCambiar: (valor: string) => void
  autoComplete: 'new-password' | 'current-password'
  /** Muestra la barra y los requisitos (para contraseñas nuevas). */
  conFortaleza?: boolean
  /** Ofrece «Generar una segura» (al restablecer o crear la de otra persona). */
  generable?: boolean
  invalido?: boolean
  ayuda?: ReactNode
  /** Contenido al final del campo (por ejemplo, la marca de que coincide). */
  marca?: ReactNode
}

/** Contraseña con botón para mostrarla y, opcionalmente, generador y requisitos. */
export function CampoClave({ etiqueta, valor, alCambiar, autoComplete, conFortaleza, generable, invalido, ayuda, marca }: Props) {
  const id = useId()
  const [ver, setVer] = useState(false)
  const textoVer = ver ? 'Ocultar contraseña' : 'Mostrar contraseña'

  return (
    <div className="campo">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <label className="etiqueta" htmlFor={id}>
          {etiqueta}
        </label>
        {generable && (
          <button
            className="boton boton-fantasma boton-mini"
            type="button"
            onClick={() => {
              alCambiar(generarClave())
              setVer(true)
            }}
            style={{ minHeight: 28, padding: '0 8px' }}
          >
            Generar una segura
          </button>
        )}
      </div>
      <div className="caja-clave">
        <input
          id={id}
          className={`control${invalido ? ' invalido' : ''}`}
          type={ver ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          aria-invalid={invalido || undefined}
          style={marca ? { paddingRight: 72 } : undefined}
        />
        {marca && (
          <span className="marca-campo" style={{ right: 48 }} aria-hidden="true">
            {marca}
          </span>
        )}
        <button className="boton-ojo" type="button" onClick={() => setVer(!ver)} aria-label={textoVer} title={textoVer}>
          <Icono nombre={ver ? 'ojoTachado' : 'ojo'} />
        </button>
      </div>
      {conFortaleza && <FortalezaClave clave={valor} conTitulo={false} />}
      {ayuda && <span className="suave">{ayuda}</span>}
    </div>
  )
}
