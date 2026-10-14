import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { CartelAnuncio } from '../../components/CartelAnuncio'
import { AvisoError, Buscador, CabeceraPagina, Esqueleto, Interruptor, Migas, Pestanas } from '../../components/Comunes'
import { Icono } from '../../components/Icono'
import { DURACION_SEGUNDOS, FORMATOS_MULTIMEDIA, FORMATOS_POR_EXTENSION, LONGITUDES, TAMANO_MAXIMO_MB } from '../../constants/limites'
import { useAvisos } from '../../hooks/useAvisos'
import { useDatos } from '../../hooks/useDatos'
import { useMedio } from '../../hooks/useMedio'
import { anunciosApi, multimediaApi } from '../../services/adminApi'
import type { Anuncio, ArchivoMultimedia, TipoMultimedia } from '../../types/api'
import { degradadoDe } from '../../utils/carteles'
import { coincideBusqueda, formatearDuracion, formatearTamano, plural } from '../../utils/formato'
import './multimedia.css'

const MB = 1024 * 1024
const PASOS_VALIDACION = ['Extensión permitida', 'Tipo de archivo (MIME)', 'Firma del contenido', 'Tamaño dentro del límite']

type Fase = 'inicial' | 'error' | 'elegido' | 'subiendo' | 'validando' | 'listo'

interface Subida {
  fase: Fase
  archivo: File | null
  nombre: string
  bytes: number
  tipo: TipoMultimedia | null
  duracion: string
  progreso: number
  pasos: number
  error?: string
  mensaje?: string
  medioId?: number
}

const SIN_SUBIDA: Subida = { fase: 'inicial', archivo: null, nombre: '', bytes: 0, tipo: null, duracion: '', progreso: 0, pasos: 0 }
const ANUNCIO_VACIO = { titulo: '', medioId: '', duracion: 10, error: '', ocupado: false }

function extension(nombre: string) {
  const i = nombre.lastIndexOf('.')
  return i < 0 ? '' : nombre.slice(i + 1).toLowerCase()
}

function tituloDesdeArchivo(nombre: string) {
  const base = nombre.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return (base.charAt(0).toLocaleUpperCase('es') + base.slice(1)).slice(0, LONGITUDES.tituloAnuncio)
}

function limitarDuracion(n: number) {
  return Math.min(DURACION_SEGUNDOS.maxima, Math.max(DURACION_SEGUNDOS.minima, Math.round(Number(n) || DURACION_SEGUNDOS.minima)))
}

/** Revisa el archivo con las mismas reglas que la API antes de dejarlo subir (la API vuelve a comprobarlo todo). */
function revisarArchivo(archivo: File): Subida {
  const formato = FORMATOS_POR_EXTENSION[extension(archivo.name)]
  const base: Subida = { ...SIN_SUBIDA, archivo, nombre: archivo.name, bytes: archivo.size, tipo: formato?.tipo ?? null }
  if (!formato) {
    return { ...base, fase: 'error', error: `Formato no permitido. Formatos aceptados: ${FORMATOS_MULTIMEDIA.split(',').join(', ')}.` }
  }
  if (archivo.type && archivo.type !== formato.mime) {
    return { ...base, fase: 'error', error: `El tipo del archivo (${archivo.type}) no coincide con su extensión.` }
  }
  const maximo = TAMANO_MAXIMO_MB[formato.tipo] * MB
  if (archivo.size > maximo) {
    return { ...base, fase: 'error', error: `Supera el límite de ${formatearTamano(maximo)} para ${formato.tipo === 'Video' ? 'videos' : 'imágenes'}.` }
  }
  if (archivo.size === 0) {
    return { ...base, fase: 'error', error: 'El archivo está vacío.' }
  }
  return { ...base, fase: 'elegido' }
}

function mensajeDe(e: unknown, predeterminado: string) {
  return e instanceof Error ? e.message : predeterminado
}

export function MultimediaPage() {
  const avisar = useAvisos()
  // Se piden también los archivados: el resumen de uso los cuenta y el interruptor solo filtra la vista.
  const medios = useDatos(() => multimediaApi.listar(true))
  const anuncios = useDatos(() => anunciosApi.listar())
  const [tipo, setTipo] = useState<'todos' | TipoMultimedia>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [verArchivados, setVerArchivados] = useState(false)
  const [subida, setSubida] = useState<Subida>(SIN_SUBIDA)
  const [arrastrando, setArrastrando] = useState(false)
  const [formulario, setFormulario] = useState(false)
  const [anuncio, setAnuncio] = useState(ANUNCIO_VACIO)
  const [nuevos, setNuevos] = useState<Record<string, boolean>>({})
  const [ocupados, setOcupados] = useState<Record<string, boolean>>({})
  const seccionAnuncios = useRef<HTMLElement>(null)

  // Mientras el servidor valida, los pasos se van marcando; el último se marca al recibir la respuesta.
  useEffect(() => {
    if (subida.fase !== 'validando') {
      return
    }
    const temporizador = window.setInterval(
      () => setSubida((s) => (s.fase === 'validando' && s.pasos < PASOS_VALIDACION.length - 1 ? { ...s, pasos: s.pasos + 1 } : s)),
      350,
    )
    return () => window.clearInterval(temporizador)
  }, [subida.fase])

  const listaMedios = medios.datos ?? []
  const listaAnuncios = anuncios.datos ?? []
  const usos = (id: number) => listaAnuncios.filter((a) => a.archivoMultimediaId === id).length
  const enVista = listaMedios.filter((m) => verArchivados || !m.estaArchivado)
  const visibles = enVista.filter((m) => (tipo === 'todos' || m.tipoMultimedia === tipo) && coincideBusqueda(busqueda, m.nombreOriginal))
  const disponibles = listaMedios.filter((m) => !m.estaArchivado)

  const recibirArchivo = (archivo: File | undefined | null) => {
    if (archivo) {
      setSubida(revisarArchivo(archivo))
    }
  }

  const alElegir = (e: ChangeEvent<HTMLInputElement>) => {
    recibirArchivo(e.target.files?.[0])
    e.target.value = ''
  }

  const alSoltar = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setArrastrando(false)
    recibirArchivo(e.dataTransfer?.files?.[0])
  }

  const subir = async () => {
    const actual = subida
    if (!actual.archivo) {
      return
    }
    const idsPrevios = new Set(listaMedios.map((m) => m.id))
    setSubida({ ...actual, fase: 'subiendo', progreso: 0, pasos: 0 })
    try {
      const duracion = actual.tipo === 'Video' && actual.duracion ? limitarDuracion(Number(actual.duracion)) : undefined
      const creado = await multimediaApi.cargar(
        actual.archivo,
        duracion,
        (fraccion) => setSubida((s) => (s.fase === 'subiendo' ? { ...s, progreso: Math.round(fraccion * 100) } : s)),
        () => setSubida((s) => ({ ...s, fase: 'validando', progreso: 100 })),
      )
      const reutilizado = idsPrevios.has(creado.id)
      if (!reutilizado) {
        setNuevos((n) => ({ ...n, [`m${creado.id}`]: true }))
      }
      setSubida((s) => ({
        ...s,
        fase: 'listo',
        progreso: 100,
        pasos: PASOS_VALIDACION.length,
        medioId: creado.id,
        mensaje: reutilizado
          ? creado.estaArchivado
            ? 'Ya existía un archivo idéntico (archivado); se reutilizó.'
            : 'Ya existía un archivo idéntico; se reutilizó.'
          : 'Archivo agregado a la biblioteca.',
      }))
      setTipo('todos')
      setBusqueda('')
      await medios.recargar()
    } catch (e) {
      setSubida((s) => ({ ...s, fase: 'error', error: mensajeDe(e, 'No se pudo subir el archivo.') }))
    }
  }

  const abrirFormulario = (medio?: ArchivoMultimedia) => {
    setAnuncio(
      medio
        ? { ...ANUNCIO_VACIO, titulo: tituloDesdeArchivo(medio.nombreOriginal), medioId: String(medio.id), duracion: medio.duracionSegundos ?? 10 }
        : ANUNCIO_VACIO,
    )
    setFormulario(true)
    window.setTimeout(() => seccionAnuncios.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const crearAnuncio = async (e: FormEvent) => {
    e.preventDefault()
    const titulo = anuncio.titulo.trim()
    if (!titulo || !anuncio.medioId) {
      return setAnuncio({ ...anuncio, error: 'Escriba el título y elija el archivo.' })
    }
    setAnuncio({ ...anuncio, ocupado: true, error: '' })
    try {
      const creado = await anunciosApi.crear({
        titulo,
        archivoMultimediaId: Number(anuncio.medioId),
        duracionPredeterminadaSegundos: limitarDuracion(anuncio.duracion),
        estaActivo: true,
      })
      setNuevos((n) => ({ ...n, [`a${creado.id}`]: true }))
      setFormulario(false)
      setAnuncio(ANUNCIO_VACIO)
      await anuncios.recargar()
      avisar(`Anuncio «${titulo}» creado. Agréguelo a una lista para publicarlo.`)
    } catch (ex) {
      setAnuncio((a) => ({ ...a, ocupado: false, error: mensajeDe(ex, 'No se pudo crear el anuncio.') }))
    }
  }

  const ocupar = async (clave: string, accion: () => Promise<unknown>, mensaje: string) => {
    setOcupados((o) => ({ ...o, [clave]: true }))
    try {
      await accion()
      avisar(mensaje)
    } catch (e) {
      avisar(mensajeDe(e, 'No se pudo guardar el cambio.'), { error: true })
    } finally {
      setOcupados((o) => ({ ...o, [clave]: false }))
    }
  }

  const alternarArchivado = (m: ArchivoMultimedia) =>
    ocupar(
      `m${m.id}`,
      async () => {
        await multimediaApi.cambiarArchivado(m.id, !m.estaArchivado)
        await medios.recargar()
      },
      m.estaArchivado ? `«${m.nombreOriginal}» restaurado.` : `«${m.nombreOriginal}» archivado: ya no aparece al crear anuncios.`,
    )

  const alternarAnuncio = (a: Anuncio) =>
    ocupar(
      `a${a.id}`,
      async () => {
        await anunciosApi.actualizar(a.id, {
          titulo: a.titulo,
          descripcion: a.descripcion,
          archivoMultimediaId: a.archivoMultimediaId,
          duracionPredeterminadaSegundos: a.duracionPredeterminadaSegundos,
          estaActivo: !a.estaActivo,
        })
        await anuncios.recargar()
      },
      a.estaActivo ? `«${a.titulo}» desactivado: no se podrá agregar a listas nuevas.` : `«${a.titulo}» activado.`,
    )

  const bytesVideos = listaMedios.filter((m) => m.tipoMultimedia === 'Video').reduce((t, m) => t + m.tamanoBytes, 0)
  const bytesImagenes = listaMedios.filter((m) => m.tipoMultimedia === 'Imagen').reduce((t, m) => t + m.tamanoBytes, 0)
  const bytesTotal = bytesVideos + bytesImagenes || 1
  const activos = listaAnuncios.filter((a) => a.estaActivo).length
  const seleccionado = anuncio.medioId ? listaMedios.find((m) => String(m.id) === anuncio.medioId) : undefined
  const enProceso = subida.fase === 'subiendo' || subida.fase === 'validando'

  return (
    <>
      <Migas pagina="Multimedia y anuncios" />

      <CabeceraPagina
        titulo="Multimedia y anuncios"
        descripcion="Suba imágenes y videos y conviértalos en anuncios. Después, los anuncios se agregan a las listas que se publican en las pantallas."
      >
        <button className="boton boton-secundario" type="button" onClick={() => abrirFormulario()}>
          <Icono nombre="volumen" />
          <span>Nuevo anuncio</span>
        </button>
        <label className="boton boton-primario" htmlFor="entrada-archivo" aria-disabled={enProceso}>
          <Icono nombre="subir" />
          <span>Subir archivo</span>
        </label>
      </CabeceraPagina>

      <AvisoError mensaje={medios.error ?? anuncios.error} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <section
          className="tarjeta entrada"
          aria-labelledby="titulo-biblioteca"
          style={{ flex: '999 1 560px', minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, animationDelay: '.06s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 id="titulo-biblioteca" className="titulo-serif" style={{ fontSize: 26, lineHeight: '34px', fontWeight: 700 }}>
                Biblioteca
              </h2>
              <span className="chip">{plural(disponibles.length, 'archivo', 'archivos')}</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}>
              <Interruptor encendido={verArchivados} alCambiar={setVerArchivados} etiqueta="Ver archivados" />
              <span>Ver archivados</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Pestanas
              etiqueta="Filtrar por tipo"
              valor={tipo}
              alCambiar={setTipo}
              pestanas={[
                { valor: 'todos', texto: 'Todos', cuenta: enVista.length },
                { valor: 'Imagen', texto: 'Imágenes', cuenta: enVista.filter((m) => m.tipoMultimedia === 'Imagen').length },
                { valor: 'Video', texto: 'Videos', cuenta: enVista.filter((m) => m.tipoMultimedia === 'Video').length },
              ]}
            />
            <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar archivo" marcador="Buscar por nombre" anchoMaximo={280} />
          </div>

          {medios.cargando && !medios.datos && <Esqueleto alto={160} cantidad={2} />}

          {medios.datos && visibles.length === 0 && (
            <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <Icono nombre="imagen" tamano={40} grosor={1.6} style={{ color: 'var(--malva)' }} />
              <h3 className="titulo-serif" style={{ fontSize: 20, lineHeight: '28px' }}>
                {listaMedios.length === 0 ? 'La biblioteca está vacía' : 'Ningún archivo coincide'}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--pizarra)' }}>
                {listaMedios.length === 0 ? 'Suba la primera imagen o el primer video.' : 'Pruebe con otra búsqueda u otro tipo.'}
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {visibles.map((m, i) => {
              const n = usos(m.id)
              return (
                <article
                  key={m.id}
                  className={`tarjeta medio${m.estaArchivado ? ' archivado' : ''}${nuevos[`m${m.id}`] ? ' nuevo' : ''}`}
                  style={{ animationDelay: `${(i * 0.04 + 0.1).toFixed(2)}s` }}
                >
                  <VistaMedio medio={m} />
                  <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    <div style={{ minWidth: 0 }}>
                      <h3
                        className="titulo-serif"
                        title={m.nombreOriginal}
                        style={{ fontSize: 15, lineHeight: '21px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {m.nombreOriginal}
                      </h3>
                      <span className="suave">
                        {m.tipoMultimedia === 'Video' ? 'Video' : 'Imagen'} · Cargado el{' '}
                        {new Date(m.fechaCargaUtc).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span className={`chip${n ? ' chip-en-linea' : ''}`}>{n ? `En ${plural(n, 'anuncio', 'anuncios')}` : 'Sin usar'}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!m.estaArchivado && (
                          <button
                            className="icono-accion"
                            type="button"
                            onClick={() => abrirFormulario(m)}
                            aria-label={`Crear anuncio con ${m.nombreOriginal}`}
                            title="Crear anuncio con este archivo"
                          >
                            <Icono nombre="volumen" tamano={16} />
                          </button>
                        )}
                        <button
                          className="icono-accion"
                          type="button"
                          onClick={() => void alternarArchivado(m)}
                          disabled={ocupados[`m${m.id}`]}
                          aria-label={m.estaArchivado ? `Restaurar ${m.nombreOriginal}` : `Archivar ${m.nombreOriginal}`}
                          title={m.estaArchivado ? 'Restaurar' : 'Archivar'}
                        >
                          <Icono nombre={m.estaArchivado ? 'restaurar' : 'caja'} tamano={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section className="tarjeta entrada" aria-labelledby="titulo-subir" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animationDelay: '.12s' }}>
            <div>
              <h2 id="titulo-subir" className="titulo-serif" style={{ fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
                Subir archivo
              </h2>
              <span className="suave">Un archivo idéntico ya cargado se reutiliza.</span>
            </div>

            <input id="entrada-archivo" className="oculto" type="file" accept={FORMATOS_MULTIMEDIA} onChange={alElegir} disabled={enProceso} />

            {subida.fase === 'inicial' && (
              <label
                className={`zona-subida${arrastrando ? ' arrastrando' : ''}`}
                htmlFor="entrada-archivo"
                onDragOver={(e) => {
                  e.preventDefault()
                  setArrastrando(true)
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={alSoltar}
              >
                <Icono nombre="nube" tamano={44} grosor={1.8} className="nube" />
                <strong className="titulo-serif" style={{ fontSize: 17, lineHeight: '23px' }}>
                  Arrastre una imagen o un video
                </strong>
                <span className="suave" style={{ fontSize: 13 }}>
                  o haga clic para elegirlo
                </span>
                <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                  {['JPG', 'PNG', 'WEBP', 'MP4', 'WEBM'].map((f) => (
                    <span key={f} className="chip" style={{ height: 20, fontSize: 10 }}>
                      {f}
                    </span>
                  ))}
                </span>
                <span className="suave">
                  Imágenes hasta {TAMANO_MAXIMO_MB.Imagen} MB · Videos hasta {TAMANO_MAXIMO_MB.Video} MB
                </span>
              </label>
            )}

            {subida.fase === 'error' && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 16,
                  borderRadius: 12,
                  background: 'var(--peligro-fondo)',
                  border: '1px solid var(--peligro-borde)',
                  animation: 'aparecer .3s ease both',
                }}
              >
                <strong style={{ fontSize: 14, color: 'var(--peligro)' }}>No se puede subir «{subida.nombre}»</strong>
                <span style={{ fontSize: 13, lineHeight: '19px', color: 'var(--texto)' }}>{subida.error}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label className="boton boton-secundario boton-mini" htmlFor="entrada-archivo">
                    Elegir otro archivo
                  </label>
                  <button className="boton boton-fantasma boton-mini" type="button" onClick={() => setSubida(SIN_SUBIDA)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {['elegido', 'subiendo', 'validando', 'listo'].includes(subida.fase) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'aparecer .3s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'var(--sutil)', border: '1px solid var(--borde)' }}>
                  <span
                    aria-hidden="true"
                    style={{ flex: 'none', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--superficie)', color: 'var(--coral)' }}
                  >
                    <Icono nombre={subida.tipo === 'Video' ? 'video' : 'imagen'} tamano={22} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong title={subida.nombre} style={{ display: 'block', fontSize: 14, color: 'var(--titulo)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {subida.nombre}
                    </strong>
                    <span className="suave">
                      {subida.tipo === 'Video' ? 'Video' : 'Imagen'} · {formatearTamano(subida.bytes)}
                    </span>
                  </div>
                </div>

                {subida.fase === 'elegido' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {subida.tipo === 'Video' && (
                      <label className="campo">
                        <span className="etiqueta">Duración del video (s, opcional)</span>
                        <input
                          className="control"
                          type="number"
                          min={DURACION_SEGUNDOS.minima}
                          max={DURACION_SEGUNDOS.maxima}
                          placeholder="Ej. 30"
                          value={subida.duracion}
                          onChange={(e) => setSubida({ ...subida, duracion: e.target.value })}
                        />
                      </label>
                    )}
                    <div className="pie-ventana">
                      <button className="boton boton-fantasma" type="button" onClick={() => setSubida(SIN_SUBIDA)}>
                        Cambiar archivo
                      </button>
                      <button className="boton boton-primario" type="button" onClick={() => void subir()}>
                        Subir
                      </button>
                    </div>
                  </div>
                )}

                {enProceso && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--titulo)' }}>
                      <span>{subida.fase === 'validando' ? 'Validando el archivo…' : 'Subiendo…'}</span>
                      <span className="tabular">{subida.progreso}%</span>
                    </div>
                    <div className="barra barra-subida" role="progressbar" aria-label="Progreso de la carga" aria-valuemin={0} aria-valuemax={100} aria-valuenow={subida.progreso}>
                      <div className="barra-progreso" style={{ width: `${subida.progreso}%` }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                      {PASOS_VALIDACION.map((texto, i) => (
                        <div key={texto} className={`paso-validacion${subida.pasos > i ? ' hecho' : ''}`}>
                          <span className="marca" aria-hidden="true">
                            <Icono nombre="marca" tamano={10} grosor={4} />
                          </span>
                          <span>{texto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subida.fase === 'listo' && (
                  <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, fontWeight: 700, color: 'var(--titulo)' }}>
                      <span
                        aria-hidden="true"
                        style={{ width: 26, height: 26, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--estado-en-linea)', color: '#ffffff' }}
                      >
                        <Icono nombre="marca" tamano={14} grosor={3} />
                      </span>
                      <span>{subida.mensaje}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        className="boton boton-secundario boton-mini"
                        type="button"
                        onClick={() => {
                          const m = listaMedios.find((x) => x.id === subida.medioId)
                          setSubida(SIN_SUBIDA)
                          if (m) {
                            abrirFormulario(m)
                          }
                        }}
                      >
                        Crear anuncio con él
                      </button>
                      <button className="boton boton-fantasma boton-mini" type="button" onClick={() => setSubida(SIN_SUBIDA)}>
                        Subir otro
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="tarjeta entrada" aria-labelledby="titulo-uso" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '.18s' }}>
            <h2 id="titulo-uso" className="titulo-serif" style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>
              Uso de la biblioteca
            </h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="tabular" style={{ font: "700 30px/36px var(--fuente)", color: 'var(--titulo)' }}>
                {formatearTamano(bytesVideos + bytesImagenes)}
              </span>
              <span className="suave" style={{ fontSize: 13 }}>
                en {plural(listaMedios.length, 'archivo', 'archivos')}
              </span>
            </div>
            <div style={{ display: 'flex', height: 10, borderRadius: 9999, overflow: 'hidden', background: 'var(--hundida)' }}>
              <div style={{ width: `${((bytesVideos / bytesTotal) * 100).toFixed(1)}%`, background: 'var(--coral)', transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
              <div style={{ width: `${((bytesImagenes / bytesTotal) * 100).toFixed(1)}%`, background: 'var(--melon)', transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FilaUso color="var(--coral)" texto="Videos" valor={formatearTamano(bytesVideos)} />
              <FilaUso color="var(--melon)" texto="Imágenes" valor={formatearTamano(bytesImagenes)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, paddingTop: 8, borderTop: '1px solid var(--hundida)' }}>
                <span>Archivados</span>
                <span style={{ color: 'var(--titulo)', fontWeight: 700 }}>{plural(listaMedios.filter((m) => m.estaArchivado).length, 'archivo', 'archivos')}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section ref={seccionAnuncios} className="tarjeta entrada" aria-labelledby="titulo-anuncios" style={{ overflow: 'hidden', animationDelay: '.22s', scrollMarginTop: 16 }}>
        <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 id="titulo-anuncios" className="titulo-serif" style={{ fontSize: 26, lineHeight: '34px', fontWeight: 700 }}>
              Anuncios
            </h2>
            <span className="chip chip-en-linea">{plural(activos, 'activo', 'activos')}</span>
            <span className="chip">{plural(listaAnuncios.length - activos, 'inactivo', 'inactivos')}</span>
          </div>
          <button
            className={`boton ${formulario ? 'boton-fantasma' : 'boton-primario'}`}
            type="button"
            onClick={() => (formulario ? setFormulario(false) : abrirFormulario())}
            aria-expanded={formulario}
          >
            {!formulario && <Icono nombre="mas" grosor={2.2} />}
            <span>{formulario ? 'Cerrar' : 'Nuevo anuncio'}</span>
          </button>
        </div>

        <div className={`desplegable${formulario ? ' abierto' : ''}`}>
          <div>
            <form
              onSubmit={crearAnuncio}
              noValidate
              style={{
                margin: '0 24px 24px',
                padding: 20,
                borderRadius: 14,
                background: 'var(--sutil)',
                border: '1px solid var(--borde)',
                display: 'flex',
                gap: 20,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}
            >
              <div className="miniatura" aria-hidden="true" style={{ width: 200, flex: 'none' }}>
                {seleccionado ? (
                  <CartelAnuncio
                    className="cartel"
                    anuncioId={seleccionado.id}
                    archivoId={seleccionado.id}
                    tipo={seleccionado.tipoMultimedia}
                    style={{ padding: 10 }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)', fontSize: 12 }}>
                    Elija un archivo
                  </div>
                )}
              </div>
              <div style={{ flex: '1 1 360px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                <label className="campo" style={{ gridColumn: '1 / -1' }}>
                  <span className="etiqueta">Título</span>
                  <input
                    className="control"
                    maxLength={LONGITUDES.tituloAnuncio}
                    placeholder="Ej. Pague su factura en línea"
                    value={anuncio.titulo}
                    onChange={(e) => setAnuncio({ ...anuncio, titulo: e.target.value, error: '' })}
                    tabIndex={formulario ? 0 : -1}
                  />
                </label>
                <label className="campo">
                  <span className="etiqueta">Archivo</span>
                  <select
                    className="control"
                    value={anuncio.medioId}
                    onChange={(e) => {
                      const medio = listaMedios.find((m) => String(m.id) === e.target.value)
                      setAnuncio({ ...anuncio, medioId: e.target.value, duracion: medio?.duracionSegundos ?? anuncio.duracion, error: '' })
                    }}
                    tabIndex={formulario ? 0 : -1}
                  >
                    <option value="">Seleccione…</option>
                    {disponibles.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombreOriginal} ({m.tipoMultimedia === 'Video' ? 'video' : 'imagen'})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="campo">
                  <span className="etiqueta" id="etiqueta-duracion">
                    Duración predeterminada
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="paso-num" role="group" aria-labelledby="etiqueta-duracion">
                      <button
                        className="paso-boton"
                        type="button"
                        onClick={() => setAnuncio({ ...anuncio, duracion: limitarDuracion(anuncio.duracion - 1) })}
                        aria-label="Restar un segundo"
                        tabIndex={formulario ? 0 : -1}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={DURACION_SEGUNDOS.minima}
                        max={DURACION_SEGUNDOS.maxima}
                        value={anuncio.duracion}
                        onChange={(e) => setAnuncio({ ...anuncio, duracion: Number(e.target.value) })}
                        onBlur={() => setAnuncio({ ...anuncio, duracion: limitarDuracion(anuncio.duracion) })}
                        aria-label="Segundos"
                        tabIndex={formulario ? 0 : -1}
                      />
                      <button
                        className="paso-boton"
                        type="button"
                        onClick={() => setAnuncio({ ...anuncio, duracion: limitarDuracion(anuncio.duracion + 1) })}
                        aria-label="Sumar un segundo"
                        tabIndex={formulario ? 0 : -1}
                      >
                        +
                      </button>
                    </div>
                    <span className="suave">segundos</span>
                  </div>
                </div>
                {anuncio.error && (
                  <span className="error-campo" role="alert" style={{ gridColumn: '1 / -1' }}>
                    {anuncio.error}
                  </span>
                )}
                <div style={{ gridColumn: '1 / -1' }} className="pie-ventana">
                  <button className="boton boton-fantasma" type="button" onClick={() => setFormulario(false)} tabIndex={formulario ? 0 : -1}>
                    Cancelar
                  </button>
                  <button className="boton boton-primario" type="submit" disabled={anuncio.ocupado} tabIndex={formulario ? 0 : -1}>
                    {anuncio.ocupado && <Icono nombre="cargando" className="girar" grosor={2.4} />}
                    Crear anuncio
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div>
          {anuncios.datos && listaAnuncios.length === 0 && (
            <p className="suave" style={{ padding: '0 24px 24px', fontSize: 14 }}>
              Aún no hay anuncios. Cree uno a partir de un archivo de la biblioteca.
            </p>
          )}
          {listaAnuncios.map((a, i) => (
            <div
              key={a.id}
              className={`anuncio${a.estaActivo ? '' : ' inactivo'}${nuevos[`a${a.id}`] ? ' nuevo' : ''}`}
              style={{ animationDelay: `${(0.25 + i * 0.04).toFixed(2)}s` }}
            >
              <CartelAnuncio className="miniatura" anuncioId={a.id} archivoId={a.archivoMultimediaId} tipo={a.tipoMultimedia} />
              <div style={{ minWidth: 0 }}>
                <h3 className="titulo-serif" style={{ fontSize: 17, lineHeight: '23px', fontWeight: 700 }}>
                  {a.titulo}
                </h3>
                <span className="suave" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.nombreArchivo}
                </span>
              </div>
              <span className="chip solo-ancho-fila tabular" style={{ gap: 6 }}>
                <Icono nombre="reloj" tamano={12} grosor={2.4} />
                {formatearDuracion(a.duracionPredeterminadaSegundos)}
              </span>
              <span className={`chip solo-ancho-fila${a.estaActivo ? ' chip-en-linea' : ''}`}>{a.estaActivo ? 'Activo' : 'Inactivo'}</span>
              <Interruptor
                encendido={a.estaActivo}
                alCambiar={() => void alternarAnuncio(a)}
                etiqueta={a.estaActivo ? `Desactivar ${a.titulo}` : `Activar ${a.titulo}`}
                deshabilitado={ocupados[`a${a.id}`]}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function FilaUso({ color, texto, valor }: { color: string; texto: string; valor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span className="punto-centro" style={{ width: 9, height: 9, background: color }} />
        {texto}
      </span>
      <span className="tabular" style={{ color: 'var(--titulo)', fontWeight: 700 }}>
        {valor}
      </span>
    </div>
  )
}

/**
 * Vista previa de un archivo de la biblioteca. Las imágenes se cargan al hacerse visibles; los videos solo cuando se
 * pide reproducirlos, porque pueden pesar cientos de megabytes.
 */
function VistaMedio({ medio }: { medio: ArchivoMultimedia }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [reproducir, setReproducir] = useState(false)
  const esVideo = medio.tipoMultimedia === 'Video'
  const { url, fallo } = useMedio(medio.id, esVideo ? reproducir : visible)

  useEffect(() => {
    const elemento = contenedor.current
    if (!elemento || typeof IntersectionObserver === 'undefined') {
      const cuadro = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(cuadro)
    }
    const observador = new IntersectionObserver(([entrada]) => entrada.isIntersecting && setVisible(true), { rootMargin: '200px' })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  return (
    <div className="vista-medio" ref={contenedor}>
      {url && !esVideo && <img src={url} alt={medio.nombreOriginal} />}
      {url && esVideo && <video src={url} muted loop autoPlay playsInline aria-label={medio.nombreOriginal} />}
      {!url && (
        <div className="cartel" role="img" aria-label={`Vista previa de ${medio.nombreOriginal}`} style={{ background: degradadoDe(medio.id) }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', opacity: 0.85 }}>EDEEste</span>
          <span className="titulo-serif" style={{ color: '#ffffff', fontSize: 19, lineHeight: '23px', fontWeight: 700, textShadow: '0 1px 8px rgba(30,20,28,.3)' }}>
            {fallo ? 'Vista previa no disponible' : tituloDesdeArchivo(medio.nombreOriginal)}
          </span>
        </div>
      )}
      {esVideo && !url && (
        <button className="reproducir" type="button" onClick={() => setReproducir(true)} aria-label={`Reproducir ${medio.nombreOriginal}`}>
          {reproducir && !fallo ? <Icono nombre="cargando" tamano={16} className="girar" grosor={2.4} /> : <Icono nombre="reproducir" tamano={16} />}
        </button>
      )}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <span className="chip chip-oscuro" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10 }}>
          {medio.tipoMultimedia === 'Video' ? 'Video' : 'Imagen'} · {extension(medio.nombreOriginal)}
        </span>
        {medio.duracionSegundos != null && <span className="chip chip-oscuro tabular">{formatearDuracion(medio.duracionSegundos)}</span>}
      </div>
      <span className="chip chip-oscuro tabular" style={{ position: 'absolute', right: 10, bottom: 10 }}>
        {formatearTamano(medio.tamanoBytes)}
      </span>
    </div>
  )
}
