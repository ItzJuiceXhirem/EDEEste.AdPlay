import { useEffect, useId, useState, type ReactNode } from 'react'
import { Icono } from './Icono'
import { Dialogo } from './Ventanas'

/** Muestra un enlace de un solo uso (pantalla, invitación) con el botón para copiarlo. */
export function DialogoEnlace({
  titulo,
  descripcion,
  url,
  alCerrar,
}: {
  titulo: string
  descripcion: ReactNode
  url: string
  alCerrar: () => void
}) {
  const id = useId()
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!copiado) {
      return
    }
    const espera = window.setTimeout(() => setCopiado(false), 2000)
    return () => window.clearTimeout(espera)
  }, [copiado])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
    } catch {
      // Sin permiso de portapapeles: la persona puede seleccionar el texto a mano.
    }
  }

  return (
    <Dialogo titulo={titulo} idTitulo={id} alCerrar={alCerrar}>
      <span
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--estado-en-linea) 22%, transparent)',
          color: 'var(--titulo)',
        }}
      >
        <Icono nombre="enlace" tamano={24} />
      </span>
      <div>
        <h2 id={id} className="titulo-serif" style={{ margin: '0 0 6px', fontSize: 24, lineHeight: '32px' }}>
          {titulo}
        </h2>
        <p style={{ fontSize: 14, lineHeight: '21px', color: 'var(--texto)' }}>{descripcion}</p>
      </div>
      <div className="enlace-caja">
        <code title={url}>{url}</code>
        <button className="boton boton-primario boton-mini" type="button" onClick={() => void copiar()}>
          {copiado && <Icono nombre="marca" tamano={15} grosor={2.6} />}
          <span>{copiado ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
      <div className="pie-ventana">
        <button className="boton boton-fantasma" type="button" onClick={alCerrar}>
          Listo
        </button>
      </div>
    </Dialogo>
  )
}
