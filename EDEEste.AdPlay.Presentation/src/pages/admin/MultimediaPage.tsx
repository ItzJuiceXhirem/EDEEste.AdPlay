import { useRef, useState, type FormEvent } from 'react'
import { AvisoError, Cargando, Insignia } from '../../components/Comunes'
import { VistaPreviaMedio } from '../../components/VistaPreviaMedio'
import { DURACION_SEGUNDOS, FORMATOS_MULTIMEDIA, LONGITUDES } from '../../constants/limites'
import { useAccion, useDatos } from '../../hooks/useDatos'
import { anunciosApi, multimediaApi } from '../../services/adminApi'
import type { Anuncio, ArchivoMultimedia } from '../../types/api'
import { formatearFecha, formatearTamano } from '../../utils/formato'


export function MultimediaPage() {
  const [verArchivados, setVerArchivados] = useState(false)
  const medios = useDatos(() => multimediaApi.listar(verArchivados), [verArchivados])
  const anuncios = useDatos(() => anunciosApi.listar())
  const accion = useAccion()

  const entradaArchivo = useRef<HTMLInputElement>(null)
  const [duracionVideo, setDuracionVideo] = useState('')
  const [nuevoAnuncio, setNuevoAnuncio] = useState({ titulo: '', archivoMultimediaId: '', duracion: '10' })

  const cargar = async (e: FormEvent) => {
    e.preventDefault()
    const archivo = entradaArchivo.current?.files?.[0]
    if (!archivo) {
      return
    }
    const ok = await accion.ejecutar(() => multimediaApi.cargar(archivo, duracionVideo ? Number(duracionVideo) : undefined))
    if (ok) {
      if (entradaArchivo.current) {
        entradaArchivo.current.value = ''
      }
      setDuracionVideo('')
      await medios.recargar()
    }
  }

  const alternarArchivado = async (m: ArchivoMultimedia) => {
    if (await accion.ejecutar(() => multimediaApi.cambiarArchivado(m.id, !m.estaArchivado))) {
      await medios.recargar()
    }
  }

  const crearAnuncio = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await accion.ejecutar(() =>
      anunciosApi.crear({
        titulo: nuevoAnuncio.titulo,
        archivoMultimediaId: Number(nuevoAnuncio.archivoMultimediaId),
        duracionPredeterminadaSegundos: Number(nuevoAnuncio.duracion),
        estaActivo: true,
      }),
    )
    if (ok) {
      setNuevoAnuncio({ titulo: '', archivoMultimediaId: '', duracion: '10' })
      await anuncios.recargar()
    }
  }

  const alternarAnuncio = async (a: Anuncio) => {
    const ok = await accion.ejecutar(() =>
      anunciosApi.actualizar(a.id, {
        titulo: a.titulo,
        descripcion: a.descripcion,
        archivoMultimediaId: a.archivoMultimediaId,
        duracionPredeterminadaSegundos: a.duracionPredeterminadaSegundos,
        estaActivo: !a.estaActivo,
      }),
    )
    if (ok) {
      await anuncios.recargar()
    }
  }

  const mediosDisponibles = (medios.datos ?? []).filter((m) => !m.estaArchivado)

  return (
    <>
      <h1>Multimedia y anuncios</h1>
      <AvisoError mensaje={accion.error ?? medios.error ?? anuncios.error} />

      <div className="columnas">
        <div>
          <section className="tarjeta">
            <h2>Subir archivo</h2>
            <form onSubmit={cargar} className="fila">
              <label className="campo">
                Archivo ({FORMATOS_MULTIMEDIA})
                <input ref={entradaArchivo} type="file" accept={FORMATOS_MULTIMEDIA} required />
              </label>
              <label className="campo">
                Duración del vídeo (s, opcional)
                <input type="number" min={DURACION_SEGUNDOS.minima} max={DURACION_SEGUNDOS.maxima} value={duracionVideo} onChange={(e) => setDuracionVideo(e.target.value)} />
              </label>
              <button className="primario" disabled={accion.ocupado}>{accion.ocupado ? 'Subiendo…' : 'Subir'}</button>
            </form>
            <p className="suave">Se valida extensión, tipo MIME, firma del contenido y tamaño. Un archivo idéntico ya cargado se reutiliza.</p>
          </section>

          <section className="tarjeta">
            <h2>Nuevo anuncio</h2>
            <form onSubmit={crearAnuncio} style={{ display: 'grid', gap: 10 }}>
              <label className="campo">
                Título
                <input required maxLength={LONGITUDES.tituloAnuncio} value={nuevoAnuncio.titulo}
                  onChange={(e) => setNuevoAnuncio({ ...nuevoAnuncio, titulo: e.target.value })} />
              </label>
              <label className="campo">
                Archivo
                <select required value={nuevoAnuncio.archivoMultimediaId}
                  onChange={(e) => setNuevoAnuncio({ ...nuevoAnuncio, archivoMultimediaId: e.target.value })}>
                  <option value="">Seleccione…</option>
                  {mediosDisponibles.map((m) => <option key={m.id} value={m.id}>{m.nombreOriginal} ({m.tipoMultimedia})</option>)}
                </select>
              </label>
              <label className="campo">
                Duración predeterminada (s)
                <input type="number" required min={DURACION_SEGUNDOS.minima} max={DURACION_SEGUNDOS.maxima} value={nuevoAnuncio.duracion}
                  onChange={(e) => setNuevoAnuncio({ ...nuevoAnuncio, duracion: e.target.value })} />
              </label>
              <div><button className="primario" disabled={accion.ocupado}>Crear anuncio</button></div>
            </form>
          </section>

          <section className="tarjeta">
            <h2>Anuncios</h2>
            <Cargando activo={anuncios.cargando}>
              <table>
                <tbody>
                  {(anuncios.datos ?? []).map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.titulo}</strong><div className="suave">{a.nombreArchivo} · {a.duracionPredeterminadaSegundos}s</div></td>
                      <td>{a.estaActivo ? <Insignia tono="exito">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</td>
                      <td>
                        <button className="mini" onClick={() => alternarAnuncio(a)} disabled={accion.ocupado}>
                          {a.estaActivo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {anuncios.datos?.length === 0 && <p className="suave">Aún no hay anuncios.</p>}
            </Cargando>
          </section>
        </div>

        <section className="tarjeta">
          <div className="fila" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Biblioteca</h2>
            <label className="casilla">
              <input type="checkbox" checked={verArchivados} onChange={(e) => setVerArchivados(e.target.checked)} />
              Ver archivados
            </label>
          </div>
          <Cargando activo={medios.cargando}>
            <div className="cuadricula-medios">
              {(medios.datos ?? []).map((m) => (
                <div key={m.id} className="medio">
                  <VistaPreviaMedio ruta={multimediaApi.rutaContenido(m.id)} tipo={m.tipoMultimedia} alternativo={m.nombreOriginal} />
                  <div className="info">
                    <strong title={m.nombreOriginal}>{m.nombreOriginal}</strong>
                    <span className="suave">{m.tipoMultimedia} · {formatearTamano(m.tamanoBytes)} · {formatearFecha(m.fechaCargaUtc)}</span>
                    <div className="fila">
                      {m.estaArchivado && <Insignia tono="aviso">Archivado</Insignia>}
                      <button className="mini" onClick={() => alternarArchivado(m)} disabled={accion.ocupado}>
                        {m.estaArchivado ? 'Restaurar' : 'Archivar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {medios.datos?.length === 0 && <p className="suave">No hay archivos.</p>}
          </Cargando>
        </section>
      </div>
    </>
  )
}
