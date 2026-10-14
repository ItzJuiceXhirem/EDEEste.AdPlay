import { useEffect, useRef, useState } from 'react'
import { CartelAnuncio } from '../../../components/CartelAnuncio'
import { Icono } from '../../../components/Icono'
import { DURACION_SEGUNDOS } from '../../../constants/limites'
import type { Anuncio } from '../../../types/api'
import { degradadoDe } from '../../../utils/carteles'
import { formatearDuracion } from '../../../utils/formato'
import { duracionDe, type Borrador, type ElementoBorrador, type InfoAnuncio } from './borrador'

interface Props {
  borrador: Borrador
  anuncios: Anuncio[]
  info: (anuncioId: number) => InfoAnuncio
  alEditar: (cambios: Partial<Borrador>) => void
}

/** Vista previa de la lista en bucle y el orden de sus anuncios (arrastrar, subir/bajar, duración, quitar). */
export function SeccionAnuncios({ borrador, anuncios, info, alEditar }: Props) {
  const [cabezal, setCabezal] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const [sobre, setSobre] = useState<number | null>(null)
  const [anuncioAgregar, setAnuncioAgregar] = useState('')
  // Claves negativas y decrecientes para los elementos nuevos: no chocan con los ids del servidor.
  const claveNueva = useRef(-1)

  const elementos = borrador.elementos
  const tramos = elementos.reduce<{ e: ElementoBorrador; datos: InfoAnuncio; inicio: number; duracion: number }[]>((lista, e) => {
    const datos = info(e.anuncioId)
    const previo = lista[lista.length - 1]
    return [...lista, { e, datos, inicio: previo ? previo.inicio + previo.duracion : 0, duracion: duracionDe(e, datos) }]
  }, [])
  const ultimo = tramos[tramos.length - 1]
  const total = ultimo ? ultimo.inicio + ultimo.duracion : 0

  useEffect(() => {
    if (!reproduciendo || total === 0) {
      return
    }
    const reloj = window.setInterval(() => setCabezal((c) => (c + 1) % total), 1000)
    return () => window.clearInterval(reloj)
  }, [reproduciendo, total])

  const posicion = total ? cabezal % total : 0
  const indiceActual = Math.max(0, tramos.findIndex((t) => posicion >= t.inicio && posicion < t.inicio + t.duracion))
  const actual = tramos[indiceActual]
  const saltar = (i: number) => tramos.length && setCabezal(tramos[(i + tramos.length) % tramos.length].inicio)

  const mover = (desde: number, hasta: number) => {
    if (hasta < 0 || hasta >= elementos.length || desde === hasta) {
      return
    }
    const copia = [...elementos]
    const [item] = copia.splice(desde, 1)
    copia.splice(hasta, 0, item)
    alEditar({ elementos: copia })
  }

  const agregar = () => {
    const id = Number(anuncioAgregar)
    if (!id) {
      return
    }
    alEditar({ elementos: [...elementos, { clave: claveNueva.current--, anuncioId: id, duracion: '' }] })
    setAnuncioAgregar('')
  }

  const terminarArrastre = () => {
    setArrastrando(null)
    setSobre(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {tramos.length > 0 && actual && (
        <section className="tarjeta entrada" aria-labelledby="titulo-linea" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 id="titulo-linea" className="titulo-serif" style={{ fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
                Vista previa de la lista
              </h2>
              <span className="suave">Así se reproduce en las pantallas, en bucle. Toque un tramo para saltar a ese anuncio.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="control-reproduccion"
                type="button"
                onClick={() => saltar(posicion - actual.inicio > 2 ? indiceActual : indiceActual - 1)}
                aria-label="Anuncio anterior"
              >
                <Icono nombre="anterior" tamano={16} />
              </button>
              <button
                className="control-reproduccion principal"
                type="button"
                onClick={() => setReproduciendo(!reproduciendo)}
                aria-label={reproduciendo ? 'Pausar vista previa' : 'Reproducir vista previa'}
              >
                <Icono nombre={reproduciendo ? 'pausa' : 'reproducir'} />
              </button>
              <button className="control-reproduccion" type="button" onClick={() => saltar(indiceActual + 1)} aria-label="Anuncio siguiente">
                <Icono nombre="siguiente" tamano={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div className="monitor" style={{ flex: '1 1 300px', maxWidth: 380 }}>
              <CartelAnuncio
                key={`${indiceActual}-${actual.e.anuncioId}`}
                className="monitor-cartel"
                anuncioId={actual.e.anuncioId}
                archivoId={actual.datos.archivoId}
                tipo={actual.datos.tipo}
              />
              <span className="chip chip-oscuro" style={{ position: 'absolute', top: 12, left: 12 }}>
                Anuncio {indiceActual + 1} de {tramos.length}
              </span>
              <span className="chip chip-oscuro" style={{ position: 'absolute', top: 12, right: 12 }}>
                {actual.datos.tipo === 'Video' ? 'Video' : 'Imagen'}
              </span>
              <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="titulo-serif" style={{ color: '#ffffff', fontSize: 22, lineHeight: '27px', fontWeight: 700, textShadow: '0 2px 12px rgba(20,14,20,.35)' }}>
                  {actual.datos.titulo}
                </span>
                <span className="tabular" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                  {reproduciendo && (
                    <span className="ecualizador" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                  {formatearDuracion(posicion - actual.inicio)} / {formatearDuracion(actual.duracion)}
                </span>
              </div>
            </div>
            <div style={{ flex: '999 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span className="etiqueta">Vuelta completa</span>
                <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}>
                  {formatearDuracion(posicion)} / {formatearDuracion(total)}
                </span>
              </div>
              <div className="linea-lista">
                {tramos.map((t, i) => {
                  const ayuda = `${i + 1}. ${t.datos.titulo} · ${t.duracion} s`
                  return (
                    <button
                      key={t.e.clave}
                      className={`segmento-lista${i === indiceActual ? ' actual' : ''}`}
                      type="button"
                      onClick={() => setCabezal(t.inicio)}
                      title={ayuda}
                      aria-label={ayuda}
                      style={{ flex: t.duracion, background: degradadoDe(t.e.anuncioId) }}
                    >
                      <span className="segmento-texto">{t.datos.titulo}</span>
                      <span className="segmento-duracion">{t.duracion} s</span>
                    </button>
                  )
                })}
                <span className="cabezal" aria-hidden="true" style={{ left: `${total ? ((posicion / total) * 100).toFixed(2) : 0}%` }} />
              </div>
              <div className="regla" aria-hidden="true">
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <span key={f}>{formatearDuracion(Math.round(total * f))}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="tarjeta entrada" aria-labelledby="titulo-orden" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '.06s' }}>
        <div>
          <h2 id="titulo-orden" className="titulo-serif" style={{ fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
            Orden de los anuncios
          </h2>
          <span className="suave">Arrastre para reordenar. Si deja la duración vacía, se usa la predeterminada del anuncio.</span>
        </div>

        {elementos.length === 0 && (
          <div
            style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', border: '1.5px dashed var(--borde)', borderRadius: 14 }}
          >
            <Icono nombre="lista" tamano={36} grosor={1.6} style={{ color: 'var(--malva)' }} />
            <strong className="titulo-serif" style={{ fontSize: 18 }}>
              La lista está vacía
            </strong>
            <span className="suave" style={{ fontSize: 13 }}>
              Agregue anuncios abajo para empezar.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tramos.map(({ e, datos }, i) => {
            const clase = [
              'elemento',
              i === indiceActual && reproduciendo ? 'actual' : '',
              arrastrando === e.clave ? 'arrastrando' : '',
              sobre === e.clave && arrastrando !== e.clave ? 'destino' : '',
            ].join(' ')
            return (
              <div
                key={e.clave}
                className={clase}
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.effectAllowed = 'move'
                  ev.dataTransfer.setData('text/plain', String(e.clave))
                  setArrastrando(e.clave)
                }}
                onDragOver={(ev) => {
                  if (arrastrando === null) {
                    return
                  }
                  ev.preventDefault()
                  if (sobre !== e.clave) {
                    setSobre(e.clave)
                  }
                }}
                onDrop={(ev) => {
                  ev.preventDefault()
                  const desde = elementos.findIndex((x) => x.clave === arrastrando)
                  if (desde >= 0) {
                    mover(desde, i)
                  }
                  terminarArrastre()
                }}
                onDragEnd={terminarArrastre}
                style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}
              >
                <span className="asa" aria-hidden="true" title="Arrastrar">
                  <Icono nombre="asa" tamano={14} />
                </span>
                <span className="numero-elemento tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--pizarra)', textAlign: 'center' }}>
                  {i + 1}
                </span>
                <CartelAnuncio className="cartel-elemento" anuncioId={e.anuncioId} archivoId={datos.archivoId} tipo={datos.tipo} />
                <div style={{ minWidth: 0 }}>
                  <strong className="titulo-serif" style={{ display: 'block', fontSize: 16, lineHeight: '21px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {datos.titulo}
                  </strong>
                  <span className="suave">
                    {datos.tipo === 'Video' ? 'Video' : 'Imagen'} · predeterminada {datos.predeterminada} s
                  </span>
                </div>
                <label className="solo-ancho-fila" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="control"
                    type="number"
                    min={DURACION_SEGUNDOS.minima}
                    max={DURACION_SEGUNDOS.maxima}
                    placeholder={String(datos.predeterminada)}
                    value={e.duracion}
                    onChange={(ev) => alEditar({ elementos: elementos.map((x) => (x.clave === e.clave ? { ...x, duracion: ev.target.value } : x)) })}
                    aria-label={`Duración de ${datos.titulo} en segundos`}
                    style={{ width: 84, height: 36, textAlign: 'center' }}
                  />
                  <span className="suave">seg.</span>
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="icono-accion" type="button" onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label={`Subir ${datos.titulo}`}>
                    <Icono nombre="flechaArriba" tamano={15} grosor={2.2} />
                  </button>
                  <button className="icono-accion" type="button" onClick={() => mover(i, i + 1)} disabled={i === elementos.length - 1} aria-label={`Bajar ${datos.titulo}`}>
                    <Icono nombre="flechaAbajo" tamano={15} grosor={2.2} />
                  </button>
                  <button
                    className="icono-accion peligro"
                    type="button"
                    onClick={() => alEditar({ elementos: elementos.filter((x) => x.clave !== e.clave) })}
                    aria-label={`Quitar ${datos.titulo}`}
                  >
                    <Icono nombre="cerrar" tamano={15} grosor={2.2} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 6 }}>
          <select
            className="control"
            aria-label="Anuncio para agregar"
            value={anuncioAgregar}
            onChange={(e) => setAnuncioAgregar(e.target.value)}
            style={{ flex: '1 1 260px', width: 'auto' }}
          >
            <option value="">Agregar anuncio…</option>
            {anuncios
              .filter((a) => a.estaActivo)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.titulo} · {a.tipoMultimedia === 'Video' ? 'Video' : 'Imagen'} · {a.duracionPredeterminadaSegundos} s
                </option>
              ))}
          </select>
          <button className="boton boton-secundario" type="button" onClick={agregar} disabled={!anuncioAgregar}>
            <Icono nombre="mas" tamano={17} grosor={2.2} />
            <span>Agregar</span>
          </button>
        </div>
      </section>
    </div>
  )
}
