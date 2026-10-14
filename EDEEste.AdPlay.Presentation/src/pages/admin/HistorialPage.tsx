import { useState } from 'react'
import { Link } from 'react-router'
import { AvisoError, CabeceraPagina, Esqueleto, Migas, Pestanas } from '../../components/Comunes'
import { Icono } from '../../components/Icono'
import { Paginacion } from '../../components/Paginacion'
import { iniciales } from '../../hooks/useFotoUsuario'
import { useAvisos } from '../../hooks/useAvisos'
import { useDatos } from '../../hooks/useDatos'
import { listasApi, publicacionesApi } from '../../services/adminApi'
import { historialApi } from '../../services/consultasApi'
import type { EstadoExportacion, HistorialExportacion } from '../../types/api'
import { descargarArchivo } from '../../utils/descarga'
import { formatearTamano } from '../../utils/formato'
import './historial.css'

const POR_PAGINA = 10
const COLORES_LISTA = ['var(--coral)', 'var(--melon)', 'var(--malva)', 'var(--estado-sin-datos)', 'var(--durazno)', 'var(--pizarra)']

const ESTADOS_EXPORTACION: Record<EstadoExportacion, { texto: string; clase: string }> = {
  Completada: { texto: 'Completada', clase: 'chip-en-linea' },
  Generando: { texto: 'Generando', clase: 'chip-desactualizada' },
  Pendiente: { texto: 'Pendiente', clase: 'chip-desactualizada' },
  Fallida: { texto: 'Falló', clase: 'chip-desconectada' },
}

type Pestana = 'publicaciones' | 'exportaciones'

function partesFecha(utc: string) {
  const d = new Date(utc)
  return {
    dia: String(d.getDate()),
    mes: d.toLocaleDateString('es-DO', { month: 'short' }).replace('.', ''),
    fecha: d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }),
    hora: d.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' }),
  }
}

function haceDias(utc: string): string {
  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)
  const dia = new Date(utc)
  dia.setHours(0, 0, 0, 0)
  const dias = Math.round((inicioHoy.getTime() - dia.getTime()) / 86_400_000)
  return dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`
}

function Fecha({ utc }: { utc: string }) {
  const f = partesFecha(utc)
  return (
    <div className="fecha">
      <span className="fecha-dia">
        <strong>{f.dia}</strong>
        <span>{f.mes}</span>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: 'var(--titulo)', fontWeight: 700 }}>{f.fecha}</span>
        <span className="suave">{f.hora}</span>
      </span>
    </div>
  )
}

function Persona({ nombre }: { nombre: string | null }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className={`iniciales${nombre ? '' : ' vacio'}`} aria-hidden="true">
        {nombre ? iniciales(nombre) : '—'}
      </span>
      {nombre ?? 'Sistema'}
    </span>
  )
}

export function HistorialPage() {
  const avisar = useAvisos()
  const [pestana, setPestana] = useState<Pestana>('publicaciones')
  const [listaId, setListaId] = useState('')
  const [pagina, setPagina] = useState(1)
  const [descargando, setDescargando] = useState<number | null>(null)
  const filtro = { listaReproduccionId: listaId ? Number(listaId) : undefined }

  const listas = useDatos(() => listasApi.listar())
  const resumen = useDatos(() => historialApi.resumen(filtro), [listaId])
  const publicaciones = useDatos(
    () => (pestana === 'publicaciones' ? historialApi.publicaciones({ ...filtro, pagina, tamanoPagina: POR_PAGINA }) : Promise.resolve(null)),
    [pestana, listaId, pagina],
  )
  const exportaciones = useDatos(
    () => (pestana === 'exportaciones' ? historialApi.exportaciones({ ...filtro, pagina, tamanoPagina: POR_PAGINA }) : Promise.resolve(null)),
    [pestana, listaId, pagina],
  )

  const colorDe = (id: number) => {
    const indice = (listas.datos ?? []).findIndex((l) => l.id === id)
    return COLORES_LISTA[(indice < 0 ? id : indice) % COLORES_LISTA.length]
  }

  // Las exportaciones traen el nombre de la lista, no su id.
  const listaPorNombre = (nombre: string) => listas.datos?.find((l) => l.nombre === nombre)?.id

  const r = resumen.datos
  const datos = [
    { etiqueta: 'Publicaciones', valor: r ? String(r.publicaciones) : '—', ayuda: r ? `${r.publicacionesRetiradas} retiradas` : '' },
    {
      etiqueta: 'Última publicación',
      valor: r?.ultimaPublicacionUtc ? haceDias(r.ultimaPublicacionUtc) : '—',
      ayuda: r?.ultimaPublicacionLista ? `${r.ultimaPublicacionLista} · v${r.ultimaPublicacionVersion}` : 'Sin publicaciones',
    },
    { etiqueta: 'Paquetes ZIP', valor: r ? String(r.exportacionesCompletadas) : '—', ayuda: r ? `de ${r.exportaciones} solicitados` : '' },
    { etiqueta: 'Peso de los paquetes', valor: r ? formatearTamano(r.bytesPaquetes) : '—', ayuda: 'Suma de los completados' },
  ]

  const descargar = async (e: HistorialExportacion) => {
    setDescargando(e.id)
    try {
      await descargarArchivo(publicacionesApi.rutaDescarga(e.id), `AdPlay_${e.nombreLista}_v${e.numeroVersion}.zip`)
    } catch (ex) {
      avisar(ex instanceof Error ? ex.message : 'No se pudo descargar el paquete.', { error: true })
    } finally {
      setDescargando(null)
    }
  }

  const pagActual = pestana === 'publicaciones' ? publicaciones : exportaciones
  const total = pagActual.datos?.total ?? 0
  const vacio = pagActual.datos && pagActual.datos.elementos.length === 0

  return (
    <>
      <Migas pagina="Historial" />
      <CabeceraPagina titulo="Historial" descripcion="Todas las versiones publicadas y los paquetes ZIP generados, de todas las listas." />
      <AvisoError mensaje={resumen.error ?? pagActual.error} />

      <section aria-label="Resumen" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {datos.map((d, i) => (
          <div key={d.etiqueta} className="dato" style={{ animationDelay: `${(0.05 + i * 0.05).toFixed(2)}s` }}>
            <span className="etiqueta">{d.etiqueta}</span>
            <span className="dato-numero">{d.valor}</span>
            <span className="suave">{d.ayuda}</span>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Pestanas
          etiqueta="Tipo de registro"
          valor={pestana}
          alCambiar={(p) => {
            setPestana(p)
            setPagina(1)
          }}
          pestanas={[
            { valor: 'publicaciones', texto: 'Publicaciones', cuenta: r?.publicaciones ?? 0 },
            { valor: 'exportaciones', texto: 'Exportaciones', cuenta: r?.exportaciones ?? 0 },
          ]}
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="etiqueta">Lista</span>
          <select
            className="control"
            value={listaId}
            onChange={(e) => {
              setListaId(e.target.value)
              setPagina(1)
            }}
            style={{ width: 'auto', minWidth: 220 }}
          >
            <option value="">Todas las listas</option>
            {(listas.datos ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="tarjeta entrada" style={{ overflow: 'hidden', animationDelay: '.1s' }}>
        {pagActual.cargando && !pagActual.datos && (
          <div style={{ padding: 24 }}>
            <Esqueleto alto={56} cantidad={4} />
          </div>
        )}

        {pestana === 'publicaciones' && publicaciones.datos && publicaciones.datos.elementos.length > 0 && (
          <div className="tabla-caja">
            <table className="tabla" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Lista</th>
                  <th>Versión</th>
                  <th>Anuncios</th>
                  <th>Publicó</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {publicaciones.datos.elementos.map((p, i) => (
                  <tr key={p.id} className={`fila${p.estadoPublicacion === 'Retirada' ? ' retirada' : ''}`} style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}>
                    <td>
                      <Fecha utc={p.fechaPublicacionUtc} />
                    </td>
                    <td>
                      <Link className="enlace-lista" to="/admin/listas" state={{ listaId: p.listaReproduccionId }}>
                        <span className="punto-centro" aria-hidden="true" style={{ width: 9, height: 9, background: colorDe(p.listaReproduccionId) }} />
                        {p.nombreLista}
                      </Link>
                    </td>
                    <td>
                      <span className="chip chip-coral tabular">v{p.numeroVersion}</span>
                    </td>
                    <td className="tabular">{p.cantidadElementos}</td>
                    <td>
                      <Persona nombre={p.usuarioPublicador} />
                    </td>
                    <td>
                      <span className={`chip${p.estadoPublicacion === 'Publicada' ? ' chip-en-linea' : ''}`}>{p.estadoPublicacion}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pestana === 'exportaciones' && exportaciones.datos && exportaciones.datos.elementos.length > 0 && (
          <div className="tabla-caja">
            <table className="tabla" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Lista</th>
                  <th>Versión</th>
                  <th>Solicitó</th>
                  <th>Tamaño</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {exportaciones.datos.elementos.map((e, i) => {
                  const estado = ESTADOS_EXPORTACION[e.estadoExportacion]
                  return (
                    <tr key={e.id} className="fila" style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}>
                      <td>
                        <Fecha utc={e.fechaSolicitudUtc} />
                      </td>
                      <td>
                        <Link className="enlace-lista" to="/admin/listas" state={{ listaId: listaPorNombre(e.nombreLista) }}>
                          <span className="punto-centro" aria-hidden="true" style={{ width: 9, height: 9, background: colorDe(listaPorNombre(e.nombreLista) ?? 0) }} />
                          {e.nombreLista}
                        </Link>
                      </td>
                      <td>
                        <span className="chip chip-coral tabular">v{e.numeroVersion}</span>
                      </td>
                      <td>
                        <Persona nombre={e.usuarioSolicitante} />
                      </td>
                      <td className="tabular">{formatearTamano(e.tamanoBytes)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                          <span className={`chip ${estado.clase}`}>{estado.texto}</span>
                          {(e.estadoExportacion === 'Generando' || e.estadoExportacion === 'Pendiente') && (
                            <span className="barra-indeterminada" role="progressbar" aria-label="Generando paquete" />
                          )}
                          {e.estadoExportacion === 'Fallida' && e.detalleError && (
                            <span style={{ maxWidth: 240, fontSize: 12, lineHeight: '16px', color: 'var(--peligro)' }}>{e.detalleError}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {e.estadoExportacion === 'Completada' && (
                          <button
                            className="boton boton-secundario boton-mini"
                            type="button"
                            onClick={() => void descargar(e)}
                            disabled={descargando === e.id}
                            aria-label={`Descargar paquete de ${e.nombreLista} versión ${e.numeroVersion}`}
                          >
                            <Icono nombre={descargando === e.id ? 'cargando' : 'descargar'} tamano={15} className={descargando === e.id ? 'girar' : undefined} />
                            <span>Descargar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {vacio && (
          <p className="suave" style={{ padding: '40px 24px', textAlign: 'center', fontSize: 14 }}>
            {pestana === 'publicaciones' ? 'No hay publicaciones.' : 'No hay exportaciones.'}
          </p>
        )}

        <Paginacion pagina={pagina} tamanoPagina={POR_PAGINA} total={total} alCambiar={setPagina} />
      </section>
    </>
  )
}
