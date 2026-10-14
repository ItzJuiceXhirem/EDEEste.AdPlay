import { useId, useState } from 'react'
import { AvisoError, Esqueleto, Interruptor, Pestanas } from '../../../components/Comunes'
import { Icono } from '../../../components/Icono'
import { Dialogo } from '../../../components/Ventanas'
import { LONGITUDES } from '../../../constants/limites'
import { useAuth } from '../../../hooks/useAuth'
import { useAvisos } from '../../../hooks/useAvisos'
import { useDatos } from '../../../hooks/useDatos'
import { asignacionesApi, listasApi } from '../../../services/adminApi'
import type { Anuncio, ListaReproduccionResumen } from '../../../types/api'
import { formatearDuracion, plural } from '../../../utils/formato'
import { borradorDe, duracionDe, infoAnuncio, type Borrador } from './borrador'
import { SeccionAnuncios } from './SeccionAnuncios'
import { SeccionAsignaciones } from './SeccionAsignaciones'
import { SeccionVersiones } from './SeccionVersiones'

type Pestana = 'anuncios' | 'asignaciones' | 'versiones'

interface Props {
  resumen: ListaReproduccionResumen
  anuncios: Anuncio[]
  /** Cambios sin guardar de esta lista (los guarda la página para no perderlos al cambiar de lista). */
  borrador: Borrador | null
  alCambiarBorrador: (borrador: Borrador | null) => void
  alCambiarListas: () => Promise<void>
}

/** Encabezado editable de la lista y sus tres secciones: anuncios, asignaciones y versiones publicadas. */
export function DetalleLista({ resumen, anuncios, borrador, alCambiarBorrador, alCambiarListas }: Props) {
  const { esAdministrador } = useAuth()
  const avisar = useAvisos()
  const lista = useDatos(() => listasApi.obtener(resumen.id), [resumen.id])
  const publicaciones = useDatos(() => listasApi.publicaciones(resumen.id), [resumen.id])
  const asignaciones = useDatos(() => asignacionesApi.listar(resumen.id), [resumen.id])
  const [pestana, setPestana] = useState<Pestana>('anuncios')
  const [guardando, setGuardando] = useState(false)
  const [confirmarPublicar, setConfirmarPublicar] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [nuevaVersion, setNuevaVersion] = useState<number | null>(null)

  if (!lista.datos) {
    return lista.error ? <AvisoError mensaje={lista.error} /> : <Esqueleto alto={160} cantidad={2} />
  }

  const guardada = lista.datos
  const actual = borrador ?? borradorDe(guardada)
  const modificado = borrador !== null
  const editar = (cambios: Partial<Borrador>) => alCambiarBorrador({ ...actual, ...cambios })
  const info = (anuncioId: number) => infoAnuncio(anuncioId, anuncios, guardada)
  const total = actual.elementos.reduce((t, e) => t + duracionDe(e, info(e.anuncioId)), 0)
  const versiones = publicaciones.datos ?? []
  const vigente = versiones.find((v) => v.estadoPublicacion === 'Publicada')
  const siguienteNumero = (versiones[0]?.numeroVersion ?? 0) + 1

  const guardar = async () => {
    setGuardando(true)
    try {
      await listasApi.actualizar(guardada.id, {
        nombre: actual.nombre.trim() || guardada.nombre,
        descripcion: actual.descripcion.trim() || null,
        estaActiva: actual.activa,
        elementos: actual.elementos.map((e) => ({
          anuncioId: e.anuncioId,
          duracionPersonalizadaSegundos: e.duracion ? duracionDe(e, info(e.anuncioId)) : null,
        })),
      })
      await lista.recargar()
      alCambiarBorrador(null)
      await alCambiarListas()
      avisar('Cambios guardados. Publique una versión para que lleguen a las pantallas.')
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudieron guardar los cambios.', { error: true })
    } finally {
      setGuardando(false)
    }
  }

  const publicar = async () => {
    setPublicando(true)
    try {
      const publicada = await listasApi.publicar(guardada.id)
      await Promise.all([publicaciones.recargar(), alCambiarListas()])
      setNuevaVersion(publicada.id)
      setConfirmarPublicar(false)
      setPestana('versiones')
      avisar(`Versión ${publicada.numeroVersion} publicada. Las pantallas en navegador la cargarán en su próxima consulta.`)
    } catch (e) {
      setConfirmarPublicar(false)
      avisar(e instanceof Error ? e.message : 'No se pudo publicar la versión.', { error: true })
    } finally {
      setPublicando(false)
    }
  }

  const ayudaPublicar = modificado
    ? 'Guarde los cambios antes de publicar'
    : guardada.elementos.length === 0
      ? 'Agregue al menos un anuncio'
      : 'Crear una versión fija para las pantallas'

  return (
    <>
      <section className="tarjeta entrada" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animationDelay: '.1s' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              className="titulo-editable"
              maxLength={LONGITUDES.nombre}
              aria-label="Nombre de la lista"
              value={actual.nombre}
              onChange={(e) => editar({ nombre: e.target.value })}
            />
            <input
              className="descripcion-editable"
              maxLength={LONGITUDES.descripcion}
              placeholder="Agregue una descripción…"
              aria-label="Descripción"
              value={actual.descripcion}
              onChange={(e) => editar({ descripcion: e.target.value })}
            />
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}>
            <Interruptor encendido={actual.activa} alCambiar={(activa) => editar({ activa })} etiqueta="Lista activa" />
            <span>{actual.activa ? 'Activa' : 'Inactiva'}</span>
          </span>
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--hundida)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip tabular">
              {plural(actual.elementos.length, 'anuncio', 'anuncios')} · vuelta de {formatearDuracion(total)}
            </span>
            <span className={`chip${vigente ? ' chip-coral' : ''}`}>{vigente ? `En pantallas: v${vigente.numeroVersion}` : 'Sin publicar'}</span>
            {modificado && (
              <span className="chip chip-desactualizada" style={{ animation: 'aparecer .3s ease both' }}>
                Cambios sin guardar
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {modificado && (
              <button className="boton boton-fantasma" type="button" onClick={() => alCambiarBorrador(null)} disabled={guardando}>
                Descartar
              </button>
            )}
            <button className="boton boton-secundario" type="button" onClick={() => void guardar()} disabled={!modificado || guardando}>
              <Icono nombre={guardando ? 'cargando' : 'guardar'} tamano={17} className={guardando ? 'girar' : undefined} />
              <span>Guardar cambios</span>
            </button>
            {esAdministrador && (
              <button
                className="boton boton-primario"
                type="button"
                onClick={() => setConfirmarPublicar(true)}
                disabled={modificado || guardada.elementos.length === 0}
                title={ayudaPublicar}
              >
                <Icono nombre="enviar" tamano={17} />
                <span>Publicar versión</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <div style={{ alignSelf: 'flex-start' }}>
        <Pestanas
          etiqueta="Secciones de la lista"
          valor={pestana}
          alCambiar={setPestana}
          pestanas={[
            { valor: 'anuncios', texto: 'Anuncios', cuenta: actual.elementos.length },
            { valor: 'asignaciones', texto: 'Asignaciones', cuenta: asignaciones.datos?.length ?? 0 },
            { valor: 'versiones', texto: 'Versiones', cuenta: versiones.length },
          ]}
        />
      </div>

      {pestana === 'anuncios' && <SeccionAnuncios borrador={actual} anuncios={anuncios} info={info} alEditar={editar} />}
      {pestana === 'asignaciones' && (
        <SeccionAsignaciones listaId={guardada.id} asignaciones={asignaciones.datos ?? []} cargando={asignaciones.cargando} recargar={asignaciones.recargar} />
      )}
      {pestana === 'versiones' && (
        <SeccionVersiones listaId={guardada.id} versiones={versiones} nuevaVersion={nuevaVersion} recargar={publicaciones.recargar} alCambiarListas={alCambiarListas} />
      )}

      {confirmarPublicar && (
        <DialogoPublicar
          numero={siguienteNumero}
          nombre={guardada.nombre}
          anuncios={guardada.elementos.length}
          vuelta={guardada.elementos.reduce((t, e) => t + e.duracionEfectivaSegundos, 0)}
          ocupado={publicando}
          alCerrar={() => setConfirmarPublicar(false)}
          alConfirmar={() => void publicar()}
        />
      )}
    </>
  )
}

function DialogoPublicar({
  numero,
  nombre,
  anuncios,
  vuelta,
  ocupado,
  alCerrar,
  alConfirmar,
}: {
  numero: number
  nombre: string
  anuncios: number
  vuelta: number
  ocupado: boolean
  alCerrar: () => void
  alConfirmar: () => void
}) {
  const id = useId()
  return (
    <Dialogo titulo="Publicar versión" idTitulo={id} alCerrar={alCerrar} bloqueada={ocupado}>
      <span
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--coral) 20%, transparent)',
          color: 'var(--coral)',
        }}
      >
        <Icono nombre="enviar" tamano={22} />
      </span>
      <h2 id={id} className="titulo-serif" style={{ fontSize: 24, lineHeight: '32px' }}>
        ¿Publicar la versión {numero} de «{nombre}»?
      </h2>
      <p style={{ fontSize: 14, lineHeight: '21px', color: 'var(--texto)' }}>
        Se creará una copia fija de la lista. Las pantallas en navegador la cargarán en su próxima consulta; las de paquete local necesitan un ZIP nuevo.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {[
          { etiqueta: 'Versión', valor: `v${numero}` },
          { etiqueta: 'Anuncios', valor: String(anuncios) },
          { etiqueta: 'Vuelta', valor: formatearDuracion(vuelta) },
        ].map((d) => (
          <div key={d.etiqueta} style={{ padding: 12, borderRadius: 12, background: 'var(--sutil)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="etiqueta" style={{ fontSize: 10 }}>
              {d.etiqueta}
            </span>
            <strong className="tabular" style={{ fontSize: 18, color: 'var(--titulo)' }}>
              {d.valor}
            </strong>
          </div>
        ))}
      </div>
      <div className="pie-ventana" style={{ paddingTop: 4 }}>
        <button className="boton boton-fantasma" type="button" onClick={alCerrar} disabled={ocupado}>
          Cancelar
        </button>
        <button className="boton boton-primario" type="button" onClick={alConfirmar} disabled={ocupado}>
          {ocupado && <Icono nombre="cargando" className="girar" grosor={2.4} />}
          Publicar ahora
        </button>
      </div>
    </Dialogo>
  )
}
