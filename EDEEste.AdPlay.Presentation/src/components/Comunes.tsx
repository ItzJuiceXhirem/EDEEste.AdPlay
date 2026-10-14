import type { ReactNode } from 'react'
import { Icono, type NombreIcono } from './Icono'

export function AvisoError({ mensaje }: { mensaje: string | null | undefined }) {
  return mensaje ? (
    <div className="aviso-error" role="alert">
      <Icono nombre="alerta" style={{ marginTop: 0 }} />
      <span>{mensaje}</span>
    </div>
  ) : null
}

/** Ruta de migas: «Panel › Página». */
export function Migas({ pagina }: { pagina: string }) {
  return (
    <div className="migas">
      <span>Panel</span>
      <Icono nombre="derecha" tamano={14} />
      <strong>{pagina}</strong>
    </div>
  )
}

/** Título grande de la página con su descripción y, a la derecha, las acciones principales. */
export function CabeceraPagina({ titulo, descripcion, children }: { titulo: string; descripcion: ReactNode; children?: ReactNode }) {
  return (
    <header className="cabecera-pagina entrada">
      <div style={{ maxWidth: 680 }}>
        <h1>{titulo}</h1>
        <p>{descripcion}</p>
      </div>
      {children && <div className="acciones">{children}</div>}
    </header>
  )
}

export function Vacio({
  icono,
  titulo,
  children,
  accion,
}: {
  icono: NombreIcono
  titulo: string
  children?: ReactNode
  accion?: ReactNode
}) {
  return (
    <div className="estado-vacio entrada">
      <Icono nombre={icono} tamano={40} grosor={1.6} style={{ color: 'var(--malva)' }} />
      <h2>{titulo}</h2>
      {children && <p>{children}</p>}
      {accion}
    </div>
  )
}

/** Bloques grises mientras llegan los datos. */
export function Esqueleto({ alto = 120, cantidad = 1 }: { alto?: number; cantidad?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="esqueleto" style={{ height: alto }} />
      ))}
    </div>
  )
}

export function Interruptor({
  encendido,
  alCambiar,
  etiqueta,
  deshabilitado,
  titulo,
}: {
  encendido: boolean
  alCambiar: (valor: boolean) => void
  etiqueta: string
  deshabilitado?: boolean
  titulo?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      title={titulo ?? etiqueta}
      className={`interruptor${encendido ? ' encendido' : ''}`}
      disabled={deshabilitado}
      onClick={() => alCambiar(!encendido)}
    >
      <span className="perilla" />
    </button>
  )
}

export interface OpcionSegmento<T extends string> {
  valor: T
  texto: ReactNode
  titulo?: string
}

export function Segmento<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  mini,
  deshabilitado,
}: {
  opciones: OpcionSegmento<T>[]
  valor: T
  alCambiar: (valor: T) => void
  etiqueta: string
  mini?: boolean
  deshabilitado?: boolean
}) {
  return (
    <div className={`segmento${mini ? ' mini' : ''}`} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          className={o.valor === valor ? 'activa' : ''}
          aria-pressed={o.valor === valor}
          title={o.titulo}
          disabled={deshabilitado}
          onClick={() => alCambiar(o.valor)}
        >
          {o.texto}
        </button>
      ))}
    </div>
  )
}

export interface Pestana<T extends string> {
  valor: T
  texto: string
  cuenta?: number
}

/** Barra de filtros en forma de píldoras, con el conteo de cada filtro. */
export function Pestanas<T extends string>({
  pestanas,
  valor,
  alCambiar,
  etiqueta,
}: {
  pestanas: Pestana<T>[]
  valor: T
  alCambiar: (valor: T) => void
  etiqueta: string
}) {
  return (
    <div className="pestanas" role="group" aria-label={etiqueta}>
      {pestanas.map((p) => (
        <button
          key={p.valor}
          type="button"
          className={`pestana${p.valor === valor ? ' activa' : ''}`}
          aria-pressed={p.valor === valor}
          onClick={() => alCambiar(p.valor)}
        >
          <span>{p.texto}</span>
          {p.cuenta !== undefined && <span className="pestana-cuenta">{p.cuenta}</span>}
        </button>
      ))}
    </div>
  )
}

export function Buscador({
  valor,
  alCambiar,
  etiqueta,
  marcador,
  anchoMaximo,
}: {
  valor: string
  alCambiar: (valor: string) => void
  etiqueta: string
  marcador: string
  anchoMaximo?: number
}) {
  return (
    <label className="buscador" style={anchoMaximo ? { maxWidth: anchoMaximo } : undefined}>
      <span className="buscador-icono" aria-hidden="true">
        <Icono nombre="buscar" />
      </span>
      <input type="search" aria-label={etiqueta} placeholder={marcador} value={valor} onChange={(e) => alCambiar(e.target.value)} />
    </label>
  )
}

/** Punto de estado; con onda si está «vivo». */
export function Punto({ color, vivo }: { color: string; vivo?: boolean }) {
  return vivo ? (
    <span className="punto" aria-hidden="true">
      <span className="punto-onda" style={{ background: color }} />
      <span className="punto-centro" style={{ background: color }} />
    </span>
  ) : (
    <span className="punto-centro" aria-hidden="true" style={{ background: color }} />
  )
}

/** Campo con etiqueta en versalitas, ayuda y error opcional. */
export function Campo({
  etiqueta,
  ayuda,
  error,
  children,
  htmlFor,
  extra,
}: {
  etiqueta: string
  ayuda?: ReactNode
  error?: string | null
  children: ReactNode
  htmlFor?: string
  extra?: ReactNode
}) {
  return (
    <div className="campo">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <label className="etiqueta" htmlFor={htmlFor}>
          {etiqueta}
        </label>
        {extra}
      </div>
      {children}
      {error ? <span className="error-campo">{error}</span> : ayuda ? <span className="suave">{ayuda}</span> : null}
    </div>
  )
}
