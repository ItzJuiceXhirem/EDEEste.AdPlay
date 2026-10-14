import { useEffect, useId, useRef, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icono } from './Icono'

interface PropsVentana {
  alCerrar: () => void
  /** Título accesible; también se muestra si se usa el encabezado estándar. */
  titulo: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Si se indica, la ventana es un formulario y Enter lo envía. */
  alEnviar?: (e: FormEvent<HTMLFormElement>) => void
  /** Impide cerrar con Escape o con clic fuera (por ejemplo, mientras se guarda). */
  bloqueada?: boolean
}

/** Cierra con Escape, enfoca la ventana al abrir y devuelve el foco al cerrar. */
function useVentana(alCerrar: () => void, bloqueada: boolean) {
  const ref = useRef<HTMLElement>(null)
  const cerrar = useRef(alCerrar)
  const bloqueo = useRef(bloqueada)

  useEffect(() => {
    cerrar.current = alCerrar
    bloqueo.current = bloqueada
  })

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    const primerCampo = ref.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')
    ;(primerCampo ?? ref.current)?.focus()

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bloqueo.current) {
        e.stopPropagation()
        cerrar.current()
      }
    }
    document.addEventListener('keydown', alTeclear)
    const desbordamiento = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = desbordamiento
      previo?.focus?.()
    }
  }, [])

  return { ref, alClicVelo: () => !bloqueo.current && cerrar.current() }
}

function Contenedor({
  ref,
  clase,
  titulo,
  idTitulo,
  alEnviar,
  style,
  children,
}: {
  ref: React.RefObject<HTMLElement | null>
  clase: string
  titulo: string
  idTitulo: string
  alEnviar?: (e: FormEvent<HTMLFormElement>) => void
  style?: CSSProperties
  children: ReactNode
}) {
  const comunes = {
    className: clase,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': idTitulo || undefined,
    'aria-label': idTitulo ? undefined : titulo,
    tabIndex: -1,
    style,
  } as const
  return alEnviar ? (
    <form {...comunes} ref={ref as React.RefObject<HTMLFormElement>} onSubmit={alEnviar} noValidate>
      {children}
    </form>
  ) : (
    <div {...comunes} ref={ref as React.RefObject<HTMLDivElement>}>
      {children}
    </div>
  )
}

/** Ventana centrada. El contenido decide su estructura; usar EncabezadoVentana para el título estándar. */
export function Dialogo({ alCerrar, titulo, children, className, style, alEnviar, bloqueada = false, idTitulo }: PropsVentana & { idTitulo?: string }) {
  const { ref, alClicVelo } = useVentana(alCerrar, bloqueada)
  return createPortal(
    <>
      <div className="velo" onClick={alClicVelo} />
      <Contenedor
        ref={ref}
        clase={`dialogo ${className ?? ''}`}
        titulo={titulo}
        idTitulo={idTitulo ?? ''}
        alEnviar={alEnviar}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, ...style }}
      >
        {children}
      </Contenedor>
    </>,
    document.body,
  )
}

/** Panel lateral derecho para crear o editar. */
export function Cajon({
  alCerrar,
  titulo,
  antetitulo,
  children,
  className,
  style,
  alEnviar,
  bloqueada = false,
}: PropsVentana & { antetitulo?: string }) {
  const { ref, alClicVelo } = useVentana(alCerrar, bloqueada)
  const id = useId()
  return createPortal(
    <>
      <div className="velo" onClick={alClicVelo} />
      <Contenedor ref={ref} clase={`cajon ${className ?? ''}`} titulo={titulo} idTitulo={id} alEnviar={alEnviar} style={style}>
        <EncabezadoVentana id={id} titulo={titulo} antetitulo={antetitulo} alCerrar={bloqueada ? undefined : alCerrar} />
        {children}
      </Contenedor>
    </>,
    document.body,
  )
}

export function EncabezadoVentana({
  id,
  titulo,
  antetitulo,
  descripcion,
  alCerrar,
}: {
  id?: string
  titulo: string
  antetitulo?: string
  descripcion?: ReactNode
  alCerrar?: () => void
}) {
  return (
    <div className="encabezado-ventana">
      <div>
        {antetitulo && <span className="etiqueta">{antetitulo}</span>}
        <h2 id={id} style={antetitulo ? { marginTop: 4 } : undefined}>
          {titulo}
        </h2>
        {descripcion && <p>{descripcion}</p>}
      </div>
      {alCerrar && (
        <button className="icono-cerrar" type="button" onClick={alCerrar} aria-label="Cerrar">
          <Icono nombre="cerrar" grosor={2.2} />
        </button>
      )}
    </div>
  )
}

/** Confirmación simple (retirar, revocar, archivar…). */
export function Confirmacion({
  titulo,
  children,
  textoConfirmar,
  peligro,
  ocupado,
  alConfirmar,
  alCerrar,
  icono,
}: {
  titulo: string
  children: ReactNode
  textoConfirmar: string
  peligro?: boolean
  ocupado?: boolean
  alConfirmar: () => void
  alCerrar: () => void
  icono?: ReactNode
}) {
  const id = useId()
  return (
    <Dialogo titulo={titulo} idTitulo={id} alCerrar={alCerrar} bloqueada={ocupado} style={{ width: 'min(460px, calc(100vw - 32px))' }}>
      {icono && (
        <span
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: peligro ? 'var(--peligro-fondo)' : 'color-mix(in srgb, var(--coral) 20%, transparent)',
            color: peligro ? 'var(--peligro)' : 'var(--coral)',
          }}
        >
          {icono}
        </span>
      )}
      <div>
        <h2 id={id} className="titulo-serif" style={{ margin: '0 0 6px', fontSize: 24, lineHeight: '32px' }}>
          {titulo}
        </h2>
        <div style={{ fontSize: 14, lineHeight: '21px', color: 'var(--texto)' }}>{children}</div>
      </div>
      <div className="pie-ventana">
        <button className="boton boton-fantasma" type="button" onClick={alCerrar} disabled={ocupado}>
          Cancelar
        </button>
        <button className={`boton ${peligro ? 'boton-peligro' : 'boton-primario'}`} type="button" onClick={alConfirmar} disabled={ocupado}>
          {ocupado && <Icono nombre="cargando" className="girar" grosor={2.4} />}
          {textoConfirmar}
        </button>
      </div>
    </Dialogo>
  )
}
