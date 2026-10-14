import { useState } from 'react'
import { Icono } from '../../../components/Icono'
import { Confirmacion } from '../../../components/Ventanas'
import { useAuth } from '../../../hooks/useAuth'
import { useAvisos } from '../../../hooks/useAvisos'
import { useDatos } from '../../../hooks/useDatos'
import { publicacionesApi } from '../../../services/adminApi'
import { historialApi } from '../../../services/consultasApi'
import type { HistorialExportacion, PublicacionLista } from '../../../types/api'
import { descargarArchivo } from '../../../utils/descarga'
import { formatearDuracion, formatearTamano, plural } from '../../../utils/formato'

interface Props {
  listaId: number
  versiones: PublicacionLista[]
  /** Publicación recién creada, para resaltarla. */
  nuevaVersion: number | null
  recargar: () => Promise<void>
  alCambiarListas: () => Promise<void>
}

function fechaLarga(utc: string) {
  return new Date(utc).toLocaleString('es-DO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Línea de tiempo de las versiones publicadas, con su retiro y la exportación a paquete ZIP. */
export function SeccionVersiones({ listaId, versiones, nuevaVersion, recargar, alCambiarListas }: Props) {
  const { esAdministrador } = useAuth()
  const avisar = useAvisos()
  // El historial aporta quién publicó cada versión y los paquetes generados de toda la lista en una sola consulta.
  const historial = useDatos(() => historialApi.publicaciones({ listaReproduccionId: listaId, tamanoPagina: 100 }), [listaId, versiones.length])
  const exportaciones = useDatos(() => historialApi.exportaciones({ listaReproduccionId: listaId, tamanoPagina: 100 }), [listaId])
  const [generando, setGenerando] = useState<Record<number, boolean>>({})
  const [descargando, setDescargando] = useState<number | null>(null)
  const [retirar, setRetirar] = useState<PublicacionLista | null>(null)
  const [retirando, setRetirando] = useState(false)

  const ordenadas = [...versiones].sort((a, b) => b.numeroVersion - a.numeroVersion)
  const vigente = ordenadas.find((v) => v.estadoPublicacion === 'Publicada')
  const autores = new Map((historial.datos?.elementos ?? []).map((h) => [h.id, h.usuarioPublicador]))
  const ultimoPaquete = new Map<number, HistorialExportacion>()
  for (const e of exportaciones.datos?.elementos ?? []) {
    const previo = ultimoPaquete.get(e.publicacionListaId)
    if (!previo || e.fechaSolicitudUtc > previo.fechaSolicitudUtc) {
      ultimoPaquete.set(e.publicacionListaId, e)
    }
  }

  const generar = async (v: PublicacionLista) => {
    setGenerando((g) => ({ ...g, [v.id]: true }))
    try {
      const resultado = await publicacionesApi.exportar(v.id)
      await exportaciones.recargar()
      if (resultado.estadoExportacion === 'Fallida') {
        avisar(resultado.detalleError ?? `No se pudo generar el paquete de la versión ${v.numeroVersion}.`, { error: true })
      } else {
        avisar(`Paquete ZIP de la versión ${v.numeroVersion} listo para descargar.`)
      }
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo generar el paquete.', { error: true })
    } finally {
      setGenerando((g) => ({ ...g, [v.id]: false }))
    }
  }

  const descargar = async (v: PublicacionLista, paquete: HistorialExportacion) => {
    setDescargando(paquete.id)
    try {
      await descargarArchivo(publicacionesApi.rutaDescarga(paquete.id), `AdPlay_${v.nombreLista}_v${v.numeroVersion}.zip`)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo descargar el paquete.', { error: true })
    } finally {
      setDescargando(null)
    }
  }

  const confirmarRetiro = async () => {
    if (!retirar) {
      return
    }
    setRetirando(true)
    try {
      await publicacionesApi.retirar(retirar.id)
      await Promise.all([recargar(), alCambiarListas()])
      avisar(`Versión ${retirar.numeroVersion} retirada.`)
      setRetirar(null)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo retirar la versión.', { error: true })
    } finally {
      setRetirando(false)
    }
  }

  const anterior = retirar ? ordenadas.find((v) => v.estadoPublicacion === 'Publicada' && v.numeroVersion < retirar.numeroVersion) : undefined

  return (
    <section className="tarjeta entrada" aria-labelledby="titulo-versiones" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 id="titulo-versiones" className="titulo-serif" style={{ margin: '0 0 4px', fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
          Versiones publicadas
        </h2>
        <span className="suave" style={{ fontSize: 13 }}>
          Cada publicación es una copia fija de la lista. Las pantallas usan la versión publicada más reciente; las de paquete local necesitan su ZIP.
        </span>
      </div>

      {ordenadas.length === 0 && (
        <p className="suave" style={{ padding: 24, textAlign: 'center', border: '1.5px dashed var(--borde)', borderRadius: 14, fontSize: 13 }}>
          Todavía no se ha publicado ninguna versión.
        </p>
      )}

      <div>
        {ordenadas.map((v, i) => {
          const publicada = v.estadoPublicacion === 'Publicada'
          const esVigente = vigente?.id === v.id
          const paquete = ultimoPaquete.get(v.id)
          const listo = paquete?.estadoExportacion === 'Completada'
          const enCurso = generando[v.id] || paquete?.estadoExportacion === 'Generando' || paquete?.estadoExportacion === 'Pendiente'
          const vuelta = v.elementos.reduce((t, e) => t + e.duracionSegundos, 0)
          const autor = autores.get(v.id)
          const clase = ['version', esVigente ? 'vigente' : '', publicada ? '' : 'retirada', nuevaVersion === v.id ? 'nueva' : ''].join(' ')
          return (
            <div key={v.id} className={clase} style={{ animationDelay: `${(i * 0.05).toFixed(2)}s` }}>
              <span className="version-punto" aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong className="titulo-serif" style={{ fontSize: 18, lineHeight: '24px' }}>
                    Versión {v.numeroVersion}
                  </strong>
                  <span className={`chip${publicada ? ' chip-en-linea' : ''}`}>{publicada ? 'Publicada' : 'Retirada'}</span>
                  {esVigente && <span className="chip chip-coral">En pantallas</span>}
                </div>
                <span className="suave tabular" style={{ fontSize: 13 }}>
                  {fechaLarga(v.fechaPublicacionUtc)} · {plural(v.elementos.length, 'anuncio', 'anuncios')} · vuelta de {formatearDuracion(vuelta)}
                  {autor && ` · publicó ${autor}`}
                </span>
                {publicada && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {enCurso && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="suave" style={{ fontWeight: 700 }}>
                          Generando paquete…
                        </span>
                        <div className="barra-indeterminada" role="progressbar" aria-label="Generando paquete ZIP" />
                      </div>
                    )}
                    {!enCurso && listo && paquete && (
                      <>
                        <button className="boton boton-secundario boton-mini" type="button" onClick={() => void descargar(v, paquete)} disabled={descargando === paquete.id}>
                          <Icono nombre={descargando === paquete.id ? 'cargando' : 'descargar'} tamano={15} className={descargando === paquete.id ? 'girar' : undefined} />
                          <span>Descargar ZIP ({formatearTamano(paquete.tamanoBytes)})</span>
                        </button>
                        {paquete.hashPaquete && (
                          <span className="mono" title={paquete.hashPaquete}>
                            SHA-256 {paquete.hashPaquete.slice(0, 12)}…
                          </span>
                        )}
                      </>
                    )}
                    {!enCurso && !listo && (
                      <>
                        <button className="boton boton-secundario boton-mini" type="button" onClick={() => void generar(v)}>
                          <Icono nombre="archivar" tamano={15} />
                          <span>{paquete?.estadoExportacion === 'Fallida' ? 'Reintentar paquete ZIP' : 'Generar paquete ZIP'}</span>
                        </button>
                        {paquete?.estadoExportacion === 'Fallida' && (
                          <span className="suave" style={{ color: 'var(--peligro)' }} title={paquete.detalleError ?? ''}>
                            El último intento falló.
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {esAdministrador && publicada && (
                <button className="boton boton-peligro boton-mini" type="button" onClick={() => setRetirar(v)} style={{ alignSelf: 'flex-start' }}>
                  Retirar
                </button>
              )}
            </div>
          )
        })}
      </div>

      {retirar && (
        <Confirmacion
          titulo={`¿Retirar la versión ${retirar.numeroVersion}?`}
          textoConfirmar="Retirar versión"
          peligro
          ocupado={retirando}
          icono={<Icono nombre="advertencia" tamano={22} />}
          alConfirmar={() => void confirmarRetiro()}
          alCerrar={() => setRetirar(null)}
        >
          Los reproductores web pasarán a{' '}
          {anterior ? `la versión publicada anterior (v${anterior.numeroVersion}).` : 'no tener contenido de esta lista, porque no hay otra versión publicada.'}
        </Confirmacion>
      )}
    </section>
  )
}
