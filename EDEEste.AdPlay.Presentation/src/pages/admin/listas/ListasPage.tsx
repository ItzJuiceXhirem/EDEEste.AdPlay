import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'
import { AvisoError, CabeceraPagina, Esqueleto, Migas, Vacio } from '../../../components/Comunes'
import { Icono } from '../../../components/Icono'
import { LONGITUDES } from '../../../constants/limites'
import { useAvisos } from '../../../hooks/useAvisos'
import { useDatos } from '../../../hooks/useDatos'
import { anunciosApi, listasApi } from '../../../services/adminApi'
import { formatearDuracion, plural } from '../../../utils/formato'
import type { Borrador } from './borrador'
import { DetalleLista } from './DetalleLista'
import './listas.css'

export function ListasPage() {
  const avisar = useAvisos()
  const listas = useDatos(() => listasApi.listar())
  const anuncios = useDatos(() => anunciosApi.listar())
  const ubicacion = useLocation()
  // Desde el historial se llega con la lista ya elegida.
  const [elegida, setElegida] = useState<number | null>(() => (ubicacion.state as { listaId?: number } | null)?.listaId ?? null)
  const [borradores, setBorradores] = useState<Record<number, Borrador>>({})
  const [nombreNueva, setNombreNueva] = useState('')
  const [creando, setCreando] = useState(false)

  const lista = listas.datos ?? []
  const seleccionada = lista.find((l) => l.id === elegida) ?? lista[0]

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    const nombre = nombreNueva.trim()
    if (!nombre) {
      return
    }
    setCreando(true)
    try {
      const creada = await listasApi.crear({ nombre, estaActiva: true, elementos: [] })
      setNombreNueva('')
      await listas.recargar()
      setElegida(creada.id)
      avisar(`Lista «${nombre}» creada. Agréguele anuncios.`)
    } catch (ex) {
      avisar(ex instanceof Error ? ex.message : 'No se pudo crear la lista.', { error: true })
    } finally {
      setCreando(false)
    }
  }

  const fijarBorrador = (id: number, borrador: Borrador | null) =>
    setBorradores((actuales) => {
      const copia = { ...actuales }
      if (borrador) {
        copia[id] = borrador
      } else {
        delete copia[id]
      }
      return copia
    })

  return (
    <>
      <Migas pagina="Listas y publicación" />
      <CabeceraPagina
        titulo="Listas y publicación"
        descripcion="Ordene los anuncios de cada lista, decida dónde y cuándo se ven, y publique una versión para que llegue a las pantallas."
      />
      <AvisoError mensaje={listas.error ?? anuncios.error} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <section
          className="tarjeta entrada"
          aria-labelledby="titulo-listas"
          style={{ flex: '1 1 280px', minWidth: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, animationDelay: '.06s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h2 id="titulo-listas" className="titulo-serif" style={{ fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
              Listas
            </h2>
            <span className="chip">{plural(lista.length, 'lista', 'listas')}</span>
          </div>
          <form onSubmit={crear} noValidate style={{ display: 'flex', gap: 8 }}>
            <input
              className="control"
              maxLength={LONGITUDES.nombre}
              placeholder="Nombre de la nueva lista"
              aria-label="Nombre de la nueva lista"
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
            />
            <button className="boton boton-primario" type="submit" aria-label="Crear lista" style={{ padding: '0 14px' }} disabled={creando || !nombreNueva.trim()}>
              <Icono nombre={creando ? 'cargando' : 'mas'} grosor={2.2} className={creando ? 'girar' : undefined} />
            </button>
          </form>

          {listas.cargando && !listas.datos && <Esqueleto alto={72} cantidad={3} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {lista.map((l) => {
              const borrador = borradores[l.id]
              const activa = borrador ? borrador.activa : l.estaActiva
              return (
                <button
                  key={l.id}
                  className={`lista-item${l.id === seleccionada?.id ? ' seleccionada' : ''}`}
                  type="button"
                  onClick={() => setElegida(l.id)}
                  aria-pressed={l.id === seleccionada?.id}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <strong className="titulo-serif" style={{ fontSize: 16, lineHeight: '21px' }}>
                      {borrador?.nombre.trim() || l.nombre}
                    </strong>
                    <span className={`chip${l.ultimaVersionPublicada != null ? ' chip-coral' : ''}`} style={{ height: 22 }}>
                      {l.ultimaVersionPublicada != null ? `v${l.ultimaVersionPublicada} publicada` : 'Sin publicar'}
                    </span>
                  </span>
                  <span className="suave tabular">
                    {plural(l.cantidadElementos, 'anuncio', 'anuncios')} · {formatearDuracion(l.duracionTotalSegundos)}
                  </span>
                  {(!activa || borrador) && (
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {!activa && (
                        <span className="chip" style={{ height: 20, fontSize: 10 }}>
                          Inactiva
                        </span>
                      )}
                      {borrador && (
                        <span className="chip chip-desactualizada" style={{ height: 20, fontSize: 10 }}>
                          Sin guardar
                        </span>
                      )}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <div style={{ flex: '999 1 640px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {listas.datos && !seleccionada && (
            <div className="tarjeta">
              <Vacio icono="lista" titulo="Todavía no hay listas">
                Cree la primera lista con el campo de la izquierda y agréguele anuncios.
              </Vacio>
            </div>
          )}
          {seleccionada && (
            <DetalleLista
              key={seleccionada.id}
              resumen={seleccionada}
              anuncios={anuncios.datos ?? []}
              borrador={borradores[seleccionada.id] ?? null}
              alCambiarBorrador={(b) => fijarBorrador(seleccionada.id, b)}
              alCambiarListas={listas.recargar}
            />
          )}
        </div>
      </div>
    </>
  )
}
