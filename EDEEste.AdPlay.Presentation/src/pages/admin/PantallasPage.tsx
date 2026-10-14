import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { CartelAnuncio } from '../../components/CartelAnuncio'
import { AvisoError, Buscador, CabeceraPagina, Esqueleto, Interruptor, Migas, Pestanas, Punto, Segmento, Vacio } from '../../components/Comunes'
import { Icono } from '../../components/Icono'
import { DialogoEnlace } from '../../components/DialogoEnlace'
import { Cajon, Dialogo } from '../../components/Ventanas'
import { LONGITUDES } from '../../constants/limites'
import { useAhora } from '../../hooks/useAnimacion'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useDatos } from '../../hooks/useDatos'
import { gruposPantallasApi, pantallasApi } from '../../services/adminApi'
import { reportesApi } from '../../services/consultasApi'
import type { EstadoPantallaReporte, GrupoPantalla, ModoReproduccion, Pantalla } from '../../types/api'
import { coincideBusqueda, formatearDuracion, hace, plural, versionCorta } from '../../utils/formato'
import { estimarReproduccion, type ReproduccionEstimada } from '../../utils/reproduccion'
import './pantallas.css'

/** Cada cuánto se vuelven a pedir las pantallas y su estado (del orden del intervalo de latido). */
const ACTUALIZAR_CADA_MS = 15_000

type ClaseEstado = 'en-linea' | 'desconectada' | 'sin-datos' | 'deshabilitada'

const ESTADOS = {
  EnLinea: { texto: 'En línea', clase: 'en-linea', color: 'var(--estado-en-linea)' },
  Desconectada: { texto: 'Desconectada', clase: 'desconectada', color: 'var(--estado-desconectada)' },
  SinDatos: { texto: 'Sin datos', clase: 'sin-datos', color: 'var(--estado-sin-datos)' },
} as const

const TEXTO_MODO: Record<ModoReproduccion, string> = { NavegadorWeb: 'Navegador web', PaqueteLocal: 'Paquete local' }

/** Una pantalla con lo que el reporte de supervisión sabe de ella (lista esperada y reproducción). */
interface PantallaConEstado {
  pantalla: Pantalla
  reporte: EstadoPantallaReporte | undefined
  ubicacion: string
}

function rutaGrupo(grupos: GrupoPantalla[], id: number): string {
  const nombres: string[] = []
  let actual = grupos.find((g) => g.id === id)
  while (actual) {
    nombres.unshift(actual.nombre)
    const padre = actual.grupoPadreId
    actual = grupos.find((g) => g.id === padre)
  }
  return nombres.join(' › ')
}

function estadoVisual(p: Pantalla): { texto: string; clase: ClaseEstado; color: string } {
  return p.estaHabilitada ? ESTADOS[p.estadoOperativo] : { texto: 'Deshabilitada', clase: 'deshabilitada', color: 'var(--estado-deshabilitada)' }
}

/** Textos del televisor según lo que esté pasando en la pantalla. */
function textosTele(item: PantallaConEstado, r: ReproduccionEstimada | null) {
  const { pantalla: p, reporte } = item
  const lista = reporte?.nombreListaEsperada ?? null
  if (r) {
    return {
      etiqueta: `Reproduciendo · anuncio ${r.indice + 1} de ${reporte?.elementosEsperados.length ?? 0}`,
      titulo: r.elemento.titulo,
      subtitulo: `Lista: ${lista}`,
    }
  }
  if (!p.estaHabilitada) {
    return { etiqueta: 'Estado', titulo: 'Deshabilitada', subtitulo: 'No recibe contenido nuevo' }
  }
  if (p.estadoOperativo === 'SinDatos') {
    return {
      etiqueta: 'Esperando conexión',
      titulo: 'Aún no se ha conectado',
      subtitulo: p.tieneTokenDispositivo ? 'Abra el enlace en el navegador del televisor' : 'Genere el enlace para conectarla',
    }
  }
  return {
    etiqueta: p.estadoOperativo === 'Desconectada' ? 'Última lista recibida' : 'Reproduce',
    titulo: lista ?? 'Sin contenido asignado',
    subtitulo: reporte?.numeroVersionEsperada != null ? `Versión esperada v${reporte.numeroVersionEsperada}` : 'Asigne una lista desde Listas y publicación',
  }
}

function textoSinReproduccion(item: PantallaConEstado): string {
  const { pantalla: p, reporte } = item
  if (!p.estaHabilitada) {
    return 'Deshabilitada'
  }
  if (p.estadoOperativo === 'Desconectada') {
    return 'Sin conexión'
  }
  if (p.modoReproduccion === 'PaqueteLocal' && p.estadoOperativo === 'EnLinea') {
    return 'Paquete local'
  }
  return reporte?.nombreListaEsperada ? 'Esperando conexión' : 'Sin lista asignada'
}

type Modal = { tipo: 'confirmar'; pantalla: Pantalla } | { tipo: 'enlace'; nombre: string; url: string } | { tipo: 'vivo'; pantallaId: number }

const FORMULARIO_VACIO = { codigo: '', nombre: '', modelo: '', grupoId: '', modo: 'NavegadorWeb' as ModoReproduccion, error: '', ocupado: false }

export function PantallasPage() {
  const { esAdministrador } = useAuth()
  const avisar = useAvisos()
  const pantallas = useDatos(() => pantallasApi.listar())
  const reporte = useDatos(() => reportesApi.estadoPantallas())
  const grupos = useDatos(() => gruposPantallasApi.listar())
  const { recargar: recargarPantallas } = pantallas
  const { recargar: recargarReporte } = reporte
  const ahora = useAhora(1000)
  const [sucursal, setSucursal] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'tarjetas' | 'tabla'>('tarjetas')
  const [cajon, setCajon] = useState(false)
  const [form, setForm] = useState(FORMULARIO_VACIO)
  const [modal, setModal] = useState<Modal | null>(null)
  const [nuevas, setNuevas] = useState<Record<number, boolean>>({})
  const [ocupadas, setOcupadas] = useState<Record<number, boolean>>({})

  const recargar = useCallback(() => Promise.all([recargarPantallas(), recargarReporte()]), [recargarPantallas, recargarReporte])

  useEffect(() => {
    const temporizador = window.setInterval(() => void recargar(), ACTUALIZAR_CADA_MS)
    return () => window.clearInterval(temporizador)
  }, [recargar])

  const listaGrupos = useMemo(() => grupos.datos ?? [], [grupos.datos])
  const todas = useMemo<PantallaConEstado[]>(() => {
    const porId = new Map((reporte.datos ?? []).map((r) => [r.pantallaId, r]))
    return [...(pantallas.datos ?? [])]
      .sort((a, b) => a.nombreSucursal.localeCompare(b.nombreSucursal, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
      .map((p) => ({ pantalla: p, reporte: porId.get(p.id), ubicacion: `${p.nombreSucursal} › ${rutaGrupo(listaGrupos, p.grupoPantallaId) || p.nombreGrupo}` }))
  }, [pantallas.datos, reporte.datos, listaGrupos])

  const sucursales = useMemo(() => {
    const mapa = new Map<number, string>()
    todas.forEach(({ pantalla }) => mapa.set(pantalla.sucursalId, pantalla.nombreSucursal))
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [todas])

  const visibles = todas.filter(
    ({ pantalla: p, ubicacion }) =>
      (sucursal === 'todas' || String(p.sucursalId) === sucursal) && coincideBusqueda(busqueda, p.nombre, p.codigoPantalla, p.modelo, ubicacion),
  )

  const cambiar = async (p: Pantalla, cambios: { estaHabilitada?: boolean; modoReproduccion?: ModoReproduccion }, mensaje: string) => {
    setOcupadas((o) => ({ ...o, [p.id]: true }))
    try {
      await pantallasApi.actualizar(p.id, cambios)
      await recargar()
      avisar(mensaje)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo guardar el cambio.', { error: true })
    } finally {
      setOcupadas((o) => ({ ...o, [p.id]: false }))
    }
  }

  const alternarHabilitada = (p: Pantalla) => {
    const nuevo = !p.estaHabilitada
    const mensaje = nuevo
      ? `«${p.nombre}» vuelve a recibir contenido.`
      : p.modoReproduccion === 'PaqueteLocal'
        ? `«${p.nombre}» deshabilitada. En paquete local, el cambio llega con el próximo paquete.`
        : `«${p.nombre}» deshabilitada; deja de recibir contenido.`
    void cambiar(p, { estaHabilitada: nuevo }, mensaje)
  }

  const cambiarModo = (p: Pantalla, modo: ModoReproduccion) => {
    if (p.modoReproduccion === modo) {
      return
    }
    const mensaje =
      modo === 'NavegadorWeb'
        ? `«${p.nombre}» ahora se conecta en línea con su enlace.`
        : `«${p.nombre}» usará paquete local. Exporte un paquete desde Listas y publicación.`
    void cambiar(p, { modoReproduccion: modo }, mensaje)
  }

  const emitirEnlace = async (p: Pantalla) => {
    setOcupadas((o) => ({ ...o, [p.id]: true }))
    try {
      const { token } = await pantallasApi.generarToken(p.id)
      setModal({ tipo: 'enlace', nombre: p.nombre, url: `${window.location.origin}/reproductor?token=${encodeURIComponent(token)}` })
      await recargarPantallas()
    } catch (e) {
      setModal(null)
      avisar(e instanceof Error ? e.message : 'No se pudo generar el enlace.', { error: true })
    } finally {
      setOcupadas((o) => ({ ...o, [p.id]: false }))
    }
  }

  const generar = (p: Pantalla) => (p.tieneTokenDispositivo ? setModal({ tipo: 'confirmar', pantalla: p }) : void emitirEnlace(p))

  const registrar = async (e: FormEvent) => {
    e.preventDefault()
    const codigo = form.codigo.trim().toUpperCase()
    const nombre = form.nombre.trim()
    if (!codigo || !nombre || !form.grupoId) {
      return setForm({ ...form, error: 'Escriba el código y el nombre, y elija la ubicación.' })
    }
    if (todas.some(({ pantalla }) => pantalla.codigoPantalla.toUpperCase() === codigo)) {
      return setForm({ ...form, error: `Ya existe una pantalla con el código ${codigo}.` })
    }
    setForm({ ...form, ocupado: true, error: '' })
    try {
      const nueva = await pantallasApi.registrar({
        codigoPantalla: codigo,
        nombre,
        modelo: form.modelo.trim() || null,
        grupoPantallaId: Number(form.grupoId),
        modoReproduccion: form.modo,
      })
      setNuevas((n) => ({ ...n, [nueva.id]: true }))
      setCajon(false)
      setForm(FORMULARIO_VACIO)
      setSucursal('todas')
      setBusqueda('')
      setVista('tarjetas')
      await recargar()
      avisar(`Pantalla «${nombre}» registrada. Genere su enlace para conectarla.`)
    } catch (ex) {
      setForm((f) => ({ ...f, ocupado: false, error: ex instanceof Error ? ex.message : 'No se pudo registrar la pantalla.' }))
    }
  }

  const cantidad = (filtro: (p: Pantalla) => boolean) => todas.filter(({ pantalla }) => filtro(pantalla)).length
  const resumen = [
    { texto: plural(todas.length, 'registrada', 'registradas'), color: 'var(--malva)' },
    { texto: plural(cantidad((p) => p.estaHabilitada), 'habilitada', 'habilitadas'), color: 'var(--estado-en-linea)' },
    { texto: plural(cantidad((p) => p.tieneTokenDispositivo), 'con enlace', 'con enlace'), color: 'var(--coral)' },
    { texto: plural(cantidad((p) => p.modoReproduccion === 'PaqueteLocal'), 'en paquete local', 'en paquete local'), color: 'var(--estado-sin-datos)' },
  ]

  const acciones = { esAdministrador, ahora, ocupadas, alternarHabilitada, cambiarModo, generar, ampliar: (id: number) => setModal({ tipo: 'vivo', pantallaId: id }) }
  const vivo = modal?.tipo === 'vivo' ? todas.find((t) => t.pantalla.id === modal.pantallaId) : undefined

  return (
    <>
      <Migas pagina="Pantallas" />

      <CabeceraPagina titulo="Pantallas" descripcion="Registre cada televisor, ubíquelo en su sucursal y genere el enlace con el que se conecta al reproductor.">
        {esAdministrador && (
          <button className="boton boton-primario" type="button" onClick={() => setCajon(true)}>
            <Icono nombre="mas" grosor={2.2} />
            <span>Registrar pantalla</span>
          </button>
        )}
      </CabeceraPagina>

      <AvisoError mensaje={pantallas.error ?? reporte.error} />

      <div className="entrada" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', animationDelay: '.06s' }}>
        {resumen.map((r) => (
          <span key={r.texto} className="chip" style={{ height: 32, padding: '0 14px', fontSize: 12, gap: 8 }}>
            <span className="punto-centro" style={{ background: r.color }} />
            {r.texto}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Pestanas
          etiqueta="Filtrar por sucursal"
          valor={sucursal}
          alCambiar={setSucursal}
          pestanas={[
            { valor: 'todas', texto: 'Todas', cuenta: todas.length },
            ...sucursales.map(([id, nombre]) => ({ valor: String(id), texto: nombre, cuenta: cantidad((p) => p.sucursalId === id) })),
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 360px', justifyContent: 'flex-end' }}>
          <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar pantalla" marcador="Buscar por nombre, código o modelo" anchoMaximo={320} />
          <Segmento
            etiqueta="Vista"
            valor={vista}
            alCambiar={setVista}
            opciones={[
              { valor: 'tarjetas', texto: <Icono nombre="cuadricula" tamano={16} titulo="Ver como tarjetas" />, titulo: 'Tarjetas' },
              { valor: 'tabla', texto: <Icono nombre="filas" tamano={16} titulo="Ver como tabla" />, titulo: 'Tabla' },
            ]}
          />
        </div>
      </div>

      {pantallas.cargando && !pantallas.datos && <Esqueleto alto={320} cantidad={1} />}

      {pantallas.datos && todas.length === 0 && (
        <div className="tarjeta">
          <Vacio
            icono="pantalla"
            titulo="Todavía no hay pantallas"
            accion={
              esAdministrador && (
                <button className="boton boton-primario" type="button" onClick={() => setCajon(true)}>
                  <Icono nombre="mas" grosor={2.2} />
                  Registrar la primera
                </button>
              )
            }
          >
            Registre cada televisor para generar su enlace y empezar a reproducir.
          </Vacio>
        </div>
      )}

      {todas.length > 0 && visibles.length === 0 && (
        <div className="tarjeta">
          <Vacio
            icono="pantalla"
            titulo="Ninguna pantalla coincide"
            accion={
              <button
                className="boton boton-fantasma"
                type="button"
                onClick={() => {
                  setBusqueda('')
                  setSucursal('todas')
                }}
              >
                Ver todas las pantallas
              </button>
            }
          >
            Pruebe con otra búsqueda o elija todas las sucursales.
          </Vacio>
        </div>
      )}

      {vista === 'tarjetas' && visibles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {visibles.map((item, i) => (
            <TarjetaPantalla key={item.pantalla.id} item={item} nueva={!!nuevas[item.pantalla.id]} retraso={`${(i * 0.04 + 0.1).toFixed(2)}s`} {...acciones} />
          ))}
        </div>
      )}

      {vista === 'tabla' && visibles.length > 0 && (
        <div className="tarjeta entrada" style={{ overflow: 'hidden' }}>
          <div className="tabla-caja">
            <table className="tabla" style={{ minWidth: 1180 }}>
              <thead>
                <tr>
                  <th>Pantalla</th>
                  <th>Ubicación</th>
                  <th>Modo</th>
                  <th>Habilitada</th>
                  <th>Estado</th>
                  <th>Reproduciendo</th>
                  <th>Último latido</th>
                  <th>Versión</th>
                  <th>Enlace</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((item, i) => (
                  <FilaPantalla key={item.pantalla.id} item={item} retraso={`${(i * 0.04 + 0.1).toFixed(2)}s`} {...acciones} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="suave" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 12, border: '1px dashed var(--borde)', fontSize: 13, lineHeight: '19px' }}>
        <Icono nombre="info" style={{ color: 'var(--malva)' }} />
        <span>
          En modo <strong style={{ color: 'var(--titulo)' }}>paquete local</strong>, deshabilitar la pantalla no borra los archivos ya copiados en el equipo; el cambio
          llega cuando se sincroniza un paquete nuevo.
        </span>
      </div>

      {cajon && (
        <Cajon
          titulo="Registrar pantalla"
          antetitulo="Nueva pantalla"
          alCerrar={() => {
            setCajon(false)
            setForm(FORMULARIO_VACIO)
          }}
          alEnviar={registrar}
          bloqueada={form.ocupado}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 12 }}>
              <label className="campo">
                <span className="etiqueta">Código</span>
                <input
                  className="control"
                  maxLength={LONGITUDES.codigoPantalla}
                  placeholder="HIG-RC-03"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value, error: '' })}
                  style={{ textTransform: 'uppercase' }}
                />
              </label>
              <label className="campo">
                <span className="etiqueta">Nombre</span>
                <input className="control" maxLength={LONGITUDES.nombre} placeholder="Recepción 3" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value, error: '' })} />
              </label>
            </div>
            <label className="campo">
              <span className="etiqueta">Modelo (opcional)</span>
              <input
                className="control"
                maxLength={LONGITUDES.modelo}
                placeholder="Marca y tamaño del televisor"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value, error: '' })}
              />
            </label>
            <label className="campo">
              <span className="etiqueta">Ubicación</span>
              <select className="control" value={form.grupoId} onChange={(e) => setForm({ ...form, grupoId: e.target.value, error: '' })}>
                <option value="">Seleccione…</option>
                {[...listaGrupos]
                  .filter((g) => g.estaActivo)
                  .map((g) => ({ id: g.id, texto: `${g.nombreSucursal} › ${rutaGrupo(listaGrupos, g.id)}` }))
                  .sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.texto}
                    </option>
                  ))}
              </select>
            </label>
            <div className="campo">
              <span className="etiqueta">Modo de reproducción</span>
              <OpcionModo
                activa={form.modo === 'NavegadorWeb'}
                alElegir={() => setForm({ ...form, modo: 'NavegadorWeb' })}
                titulo="Navegador web"
                texto="El televisor abre el reproductor en línea y recibe los cambios solo."
              />
              <OpcionModo
                activa={form.modo === 'PaqueteLocal'}
                alElegir={() => setForm({ ...form, modo: 'PaqueteLocal' })}
                titulo="Paquete local"
                texto="Reproduce un paquete ZIP copiado al equipo; se actualiza al sincronizar uno nuevo."
              />
            </div>
            {form.error && (
              <span className="error-campo" role="alert">
                {form.error}
              </span>
            )}
            <div className="pie-ventana" style={{ marginTop: 'auto', paddingTop: 12 }}>
              <button
                className="boton boton-fantasma"
                type="button"
                onClick={() => {
                  setCajon(false)
                  setForm(FORMULARIO_VACIO)
                }}
                disabled={form.ocupado}
              >
                Cancelar
              </button>
              <button className="boton boton-primario" type="submit" disabled={form.ocupado}>
                {form.ocupado && <Icono nombre="cargando" className="girar" grosor={2.4} />}
                Registrar pantalla
              </button>
            </div>
          </div>
        </Cajon>
      )}

      {modal?.tipo === 'confirmar' && (
        <DialogoRotar
          pantalla={modal.pantalla}
          ocupado={!!ocupadas[modal.pantalla.id]}
          alCerrar={() => setModal(null)}
          alConfirmar={() => void emitirEnlace(modal.pantalla)}
        />
      )}
      {modal?.tipo === 'enlace' && (
        <DialogoEnlace
          titulo={`Enlace de «${modal.nombre}»`}
          descripcion={
            <>
              Ábralo en el navegador del televisor. <strong style={{ color: 'var(--titulo)' }}>Se muestra una sola vez</strong>: si se pierde, genere uno nuevo.
            </>
          }
          url={modal.url}
          alCerrar={() => setModal(null)}
        />
      )}
      {vivo && <DialogoVivo item={vivo} ahora={ahora} alCerrar={() => setModal(null)} />}
    </>
  )
}

interface Acciones {
  esAdministrador: boolean
  ahora: number
  ocupadas: Record<number, boolean>
  alternarHabilitada: (p: Pantalla) => void
  cambiarModo: (p: Pantalla, modo: ModoReproduccion) => void
  generar: (p: Pantalla) => void
  ampliar: (id: number) => void
}

function SelectorModo({ p, esAdministrador, ocupada, cambiarModo }: { p: Pantalla; esAdministrador: boolean; ocupada: boolean; cambiarModo: Acciones['cambiarModo'] }) {
  return (
    <Segmento
      mini
      etiqueta="Modo de reproducción"
      valor={p.modoReproduccion}
      alCambiar={(modo) => cambiarModo(p, modo)}
      deshabilitado={!esAdministrador || ocupada}
      opciones={[
        { valor: 'NavegadorWeb', texto: 'Web', titulo: 'Navegador web' },
        { valor: 'PaqueteLocal', texto: 'Local', titulo: 'Paquete local' },
      ]}
    />
  )
}

function TarjetaPantalla({ item, nueva, retraso, esAdministrador, ahora, ocupadas, alternarHabilitada, cambiarModo, generar, ampliar }: Acciones & { item: PantallaConEstado; nueva: boolean; retraso: string }) {
  const { pantalla: p, reporte } = item
  const estado = estadoVisual(p)
  const r = p.estaHabilitada ? estimarReproduccion(reporte?.elementosEsperados ?? [], reporte?.reproduccion ?? null, ahora) : null
  const textos = textosTele(item, r)
  const enLinea = p.estaHabilitada && p.estadoOperativo === 'EnLinea'
  const ocupada = !!ocupadas[p.id]

  return (
    <article className={`tarjeta tarjeta-pantalla${nueva ? ' nueva' : ''}`} style={{ animationDelay: retraso }}>
      <div className={`tele tele-${estado.clase}`}>
        <div className="tele-fondo" aria-hidden="true" />
        {r && <CartelAnuncio key={r.elemento.anuncioId} className="cartel-tele" anuncioId={r.elemento.anuncioId} archivoId={r.elemento.archivoMultimediaId} tipo={r.elemento.tipoMultimedia} />}
        <div className="tele-superior">
          <span className="chip chip-oscuro">
            <Punto color={estado.color} vivo={enLinea} />
            {estado.texto}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="chip chip-oscuro" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10 }}>
              {p.modoReproduccion === 'NavegadorWeb' ? 'Web' : 'Local'}
            </span>
            <button className="boton-ampliar" type="button" onClick={() => ampliar(p.id)} aria-label={`Ver en grande ${p.nombre}`} title="Ver en grande">
              <Icono nombre="ampliar" tamano={14} grosor={2.2} />
            </button>
          </span>
        </div>
        <div className="tele-contenido">
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}>{textos.etiqueta}</span>
          <span className="titulo-serif" style={{ color: '#ffffff', fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>
            {textos.titulo}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.78)' }}>{textos.subtitulo}</span>
        </div>
        <div className="tele-pie">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {enLinea && <Ecualizador />}
            <span>{r ? `${formatearDuracion(r.segundo)} / ${formatearDuracion(r.elemento.duracionSegundos)}` : hace(p.ultimaConexionUtc, ahora)}</span>
          </span>
          <span>{r ? (r.elemento.tipoMultimedia === 'Video' ? 'Vídeo' : 'Imagen') : p.ultimaVersionReportada ? versionCorta(p.ultimaVersionReportada) : ''}</span>
        </div>
        {r && (
          <div className="progreso-tele" aria-hidden="true">
            <div style={{ width: `${r.porcentaje.toFixed(1)}%` }} />
          </div>
        )}
      </div>

      <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 className="titulo-serif" style={{ fontSize: 19, lineHeight: '25px', fontWeight: 700 }}>
              {p.nombre}
            </h3>
            <span className="suave tabular">
              {p.codigoPantalla} · {p.modelo || 'Modelo sin indicar'}
            </span>
          </div>
          {reporte?.actualizada === false && <span className="chip chip-desactualizada">Desactualizada</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--texto)' }}>
          <Icono nombre="ubicacion" tamano={15} style={{ color: 'var(--malva)' }} />
          <span>{item.ubicacion}</span>
        </div>
        <div className="suave tabular" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: -6 }}>
          <span>{p.ultimaConexionUtc ? `Último latido ${hace(p.ultimaConexionUtc, ahora)}` : 'Sin latidos todavía'}</span>
          <span aria-hidden="true">·</span>
          <span>{p.ultimaVersionReportada ? `Reporta ${versionCorta(p.ultimaVersionReportada)}` : 'Sin versión'}</span>
        </div>
        {p.ultimoError && <ErrorPantalla error={p.ultimoError} />}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid var(--hundida)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}>
            <Interruptor encendido={p.estaHabilitada} alCambiar={() => alternarHabilitada(p)} etiqueta="Habilitada" deshabilitado={!esAdministrador || ocupada} />
            <span>{p.estaHabilitada ? 'Habilitada' : 'Deshabilitada'}</span>
          </span>
          <SelectorModo p={p} esAdministrador={esAdministrador} ocupada={ocupada} cambiarModo={cambiarModo} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className={`chip${p.tieneTokenDispositivo ? ' chip-en-linea' : ''}`}>{p.tieneTokenDispositivo ? 'Enlace activo' : 'Sin enlace'}</span>
          {esAdministrador && (
            <button className="boton boton-secundario boton-mini" type="button" onClick={() => generar(p)} disabled={ocupada}>
              <Icono nombre="enlace" tamano={15} />
              <span>{p.tieneTokenDispositivo ? 'Rotar enlace' : 'Generar enlace'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function FilaPantalla({ item, retraso, esAdministrador, ahora, ocupadas, alternarHabilitada, cambiarModo, generar, ampliar }: Acciones & { item: PantallaConEstado; retraso: string }) {
  const { pantalla: p, reporte } = item
  const estado = estadoVisual(p)
  const r = p.estaHabilitada ? estimarReproduccion(reporte?.elementosEsperados ?? [], reporte?.reproduccion ?? null, ahora) : null
  const ocupada = !!ocupadas[p.id]
  return (
    <tr className="fila" style={{ animationDelay: retraso }}>
      <td>
        <strong style={{ display: 'block', color: 'var(--titulo)' }}>{p.nombre}</strong>
        <span className="suave">
          {p.codigoPantalla} · {p.modelo || 'Modelo sin indicar'}
        </span>
      </td>
      <td>{item.ubicacion}</td>
      <td>
        <SelectorModo p={p} esAdministrador={esAdministrador} ocupada={ocupada} cambiarModo={cambiarModo} />
      </td>
      <td>
        <Interruptor encendido={p.estaHabilitada} alCambiar={() => alternarHabilitada(p)} etiqueta="Habilitada" deshabilitado={!esAdministrador || ocupada} />
      </td>
      <td>
        <span className={`chip chip-${estado.clase}`}>
          <Punto color={estado.color} vivo={p.estaHabilitada && p.estadoOperativo === 'EnLinea'} />
          {estado.texto}
        </span>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
          <button className="icono-accion" type="button" onClick={() => ampliar(p.id)} aria-label={`Ver en grande ${p.nombre}`} title="Ver en grande">
            <Icono nombre="ampliar" tamano={15} grosor={2.2} />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            {r ? (
              <>
                <strong style={{ display: 'block', fontSize: 13, color: 'var(--titulo)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.elemento.titulo}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="barra-mini" style={{ flex: 1 }}>
                    <div style={{ width: `${r.porcentaje.toFixed(1)}%` }} />
                  </div>
                  <span className="suave tabular">
                    {formatearDuracion(r.segundo)} / {formatearDuracion(r.elemento.duracionSegundos)}
                  </span>
                </div>
              </>
            ) : (
              <span className="suave">{textoSinReproduccion(item)}</span>
            )}
          </div>
        </div>
      </td>
      <td className="tabular">{hace(p.ultimaConexionUtc, ahora)}</td>
      <td className="tabular">{p.ultimaVersionReportada ? versionCorta(p.ultimaVersionReportada) : '—'}</td>
      <td>
        {esAdministrador ? (
          <button className="boton boton-secundario boton-mini" type="button" onClick={() => generar(p)} disabled={ocupada}>
            {p.tieneTokenDispositivo ? 'Rotar enlace' : 'Generar enlace'}
          </button>
        ) : (
          <span className={`chip${p.tieneTokenDispositivo ? ' chip-en-linea' : ''}`}>{p.tieneTokenDispositivo ? 'Enlace activo' : 'Sin enlace'}</span>
        )}
      </td>
    </tr>
  )
}

function Ecualizador({ alto }: { alto?: number }) {
  return (
    <span className="ecualizador" aria-hidden="true" style={alto ? { height: alto } : undefined}>
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

function ErrorPantalla({ error }: { error: string }) {
  return (
    <div title={error} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12, lineHeight: '16px', color: 'var(--peligro)' }}>
      <Icono nombre="advertencia" tamano={14} grosor={2.2} style={{ marginTop: 1 }} />
      <span>{error}</span>
    </div>
  )
}

function OpcionModo({ activa, alElegir, titulo, texto }: { activa: boolean; alElegir: () => void; titulo: string; texto: string }) {
  return (
    <button className={`opcion-radio${activa ? ' activa' : ''}`} type="button" onClick={alElegir} aria-pressed={activa}>
      <span className="radio" aria-hidden="true">
        <span />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong style={{ fontSize: 14, color: 'var(--titulo)' }}>{titulo}</strong>
        <span className="suave" style={{ fontSize: 13, lineHeight: '18px' }}>
          {texto}
        </span>
      </span>
    </button>
  )
}

function IconoDialogo({ icono, fondo, color }: { icono: 'advertencia' | 'enlace'; fondo: string; color: string }) {
  return (
    <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fondo, color }}>
      <Icono nombre={icono} tamano={24} />
    </span>
  )
}

function DialogoRotar({ pantalla, ocupado, alCerrar, alConfirmar }: { pantalla: Pantalla; ocupado: boolean; alCerrar: () => void; alConfirmar: () => void }) {
  const id = useId()
  return (
    <Dialogo titulo="Rotar enlace" idTitulo={id} alCerrar={alCerrar} bloqueada={ocupado}>
      <IconoDialogo icono="advertencia" fondo="var(--fondo-desactualizada)" color="var(--estado-desactualizada)" />
      <h2 id={id} className="titulo-serif" style={{ fontSize: 24, lineHeight: '32px' }}>
        ¿Rotar el enlace de «{pantalla.nombre}»?
      </h2>
      <p style={{ fontSize: 14, lineHeight: '21px', color: 'var(--texto)' }}>
        La pantalla ya tiene un enlace. Generar otro invalida el anterior: el televisor dejará de reproducir hasta que se abra el enlace nuevo.
      </p>
      <div className="pie-ventana" style={{ paddingTop: 4 }}>
        <button className="boton boton-fantasma" type="button" onClick={alCerrar} disabled={ocupado}>
          Cancelar
        </button>
        <button className="boton boton-primario" type="button" onClick={alConfirmar} disabled={ocupado}>
          {ocupado && <Icono nombre="cargando" className="girar" grosor={2.4} />}
          Generar enlace nuevo
        </button>
      </div>
    </Dialogo>
  )
}

function DialogoVivo({ item, ahora, alCerrar }: { item: PantallaConEstado; ahora: number; alCerrar: () => void }) {
  const id = useId()
  const { pantalla: p, reporte } = item
  const estado = estadoVisual(p)
  const elementos = reporte?.elementosEsperados ?? []
  const r = p.estaHabilitada ? estimarReproduccion(elementos, reporte?.reproduccion ?? null, ahora) : null
  const textos = textosTele(item, r)

  return (
    <Dialogo titulo={`Vista en vivo de ${p.nombre}`} idTitulo={id} alCerrar={alCerrar} className="dialogo-grande" style={{ gap: 18 }}>
      <div className="encabezado-ventana">
        <div style={{ minWidth: 0 }}>
          <span className="etiqueta">Vista en vivo</span>
          <h2 id={id} style={{ margin: '4px 0 2px' }}>
            {p.nombre}
          </h2>
          <span className="suave" style={{ fontSize: 13 }}>
            {p.codigoPantalla} · {item.ubicacion}
          </span>
        </div>
        <button className="icono-cerrar" type="button" onClick={alCerrar} aria-label="Cerrar">
          <Icono nombre="cerrar" grosor={2.2} />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={`tele tele-${estado.clase}`} style={{ borderRadius: 14 }}>
            <div className="tele-fondo" aria-hidden="true" />
            {r && <CartelAnuncio key={r.elemento.anuncioId} className="cartel-tele" anuncioId={r.elemento.anuncioId} archivoId={r.elemento.archivoMultimediaId} tipo={r.elemento.tipoMultimedia} />}
            <div className="tele-superior" style={{ top: 16, left: 16, right: 16 }}>
              <span className="chip chip-oscuro" style={{ height: 28, padding: '0 12px', fontSize: 12 }}>
                <Punto color={r ? 'var(--estado-en-linea)' : estado.color} vivo={!!r} />
                {r ? 'En vivo' : estado.texto}
              </span>
              {r && (
                <span className="chip chip-oscuro" style={{ height: 28, padding: '0 12px', fontSize: 12 }}>
                  Anuncio {r.indice + 1} de {elementos.length}
                </span>
              )}
            </div>
            <div className="tele-contenido" style={{ gap: 8, padding: '0 48px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.75)' }}>{textos.etiqueta}</span>
              <span className="titulo-serif" style={{ color: '#ffffff', fontSize: 38, lineHeight: '46px', fontWeight: 700, textShadow: '0 2px 16px rgba(20,14,20,.35)' }}>
                {textos.titulo}
              </span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,.82)' }}>{textos.subtitulo}</span>
            </div>
            <div className="tele-pie" style={{ left: 16, right: 16, bottom: 16, color: '#ffffff' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700 }}>
                {r && <Ecualizador alto={16} />}
                <span>{r ? `${formatearDuracion(r.segundo)} / ${formatearDuracion(r.elemento.duracionSegundos)}` : hace(p.ultimaConexionUtc, ahora)}</span>
              </span>
              <span className="chip chip-oscuro" style={{ height: 28, padding: '0 12px', fontSize: 12 }}>
                {r ? (r.elemento.tipoMultimedia === 'Video' ? 'Vídeo' : 'Imagen') : TEXTO_MODO[p.modoReproduccion]}
              </span>
            </div>
            {r && (
              <div className="progreso-tele" aria-hidden="true" style={{ height: 5 }}>
                <div style={{ width: `${r.porcentaje.toFixed(1)}%` }} />
              </div>
            )}
          </div>

          {r && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span className="etiqueta">Vuelta completa de la lista</span>
                <span className="suave tabular" style={{ fontWeight: 700 }}>
                  {formatearDuracion(r.enCiclo)} / {formatearDuracion(r.duracionCiclo)}
                </span>
              </div>
              <div className="linea-tiempo" role="img" aria-label={`Va en ${formatearDuracion(r.enCiclo)} de ${formatearDuracion(r.duracionCiclo)} de la lista`}>
                {elementos.map((e, i) => (
                  <span key={`${e.posicion}-${e.anuncioId}`} title={`${e.titulo} · ${e.duracionSegundos} s`} style={{ flex: e.duracionSegundos || 1 }}>
                    <i
                      style={{
                        width: i < r.indice ? '100%' : i === r.indice ? `${r.porcentaje.toFixed(1)}%` : '0%',
                        background: i < r.indice ? 'color-mix(in srgb, var(--coral) 45%, transparent)' : 'var(--coral)',
                      }}
                    />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="tarjeta" style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '8px 16px', fontSize: 13, boxShadow: 'none' }}>
            <span className="suave" style={{ fontSize: 13 }}>
              Lista
            </span>
            <strong style={{ color: 'var(--titulo)', textAlign: 'right' }}>{reporte?.nombreListaEsperada ?? 'Sin lista'}</strong>
            <span className="suave" style={{ fontSize: 13 }}>
              Versión
            </span>
            <span className="tabular" style={{ textAlign: 'right' }}>
              {reporte?.numeroVersionEsperada != null
                ? `Esperada v${reporte.numeroVersionEsperada} · reporta ${p.ultimaVersionReportada ? versionCorta(p.ultimaVersionReportada) : '—'}`
                : '—'}
            </span>
            <span className="suave" style={{ fontSize: 13 }}>
              Último latido
            </span>
            <span className="tabular" style={{ textAlign: 'right' }}>
              {p.ultimaConexionUtc ? hace(p.ultimaConexionUtc, ahora) : 'Sin latidos'}
            </span>
            <span className="suave" style={{ fontSize: 13 }}>
              Modo
            </span>
            <span style={{ textAlign: 'right' }}>{TEXTO_MODO[p.modoReproduccion]}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="etiqueta" style={{ padding: '0 4px 6px' }}>
              Orden de reproducción
            </span>
            {elementos.length === 0 && (
              <p className="suave" style={{ padding: '0 4px', fontSize: 13 }}>
                Esta pantalla no tiene una lista asignada.
              </p>
            )}
            {elementos.map((e, i) => {
              const actual = !!r && i === r.indice
              const reproducido = !!r && i < r.indice
              const sigue = !!r && i === (r.indice + 1) % elementos.length
              return (
                <div key={`${e.posicion}-${e.anuncioId}`} className={`item-lista${actual ? ' actual' : reproducido ? ' reproducido' : ''}`}>
                  <span className="suave" style={{ fontWeight: 700, textAlign: 'center' }}>
                    {i + 1}
                  </span>
                  <CartelAnuncio className="mini-cartel" anuncioId={e.anuncioId} archivoId={e.archivoMultimediaId} tipo={e.tipoMultimedia} />
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <strong style={{ fontSize: 13, color: 'var(--titulo)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.titulo}</strong>
                    <span className="suave tabular">
                      {e.tipoMultimedia === 'Video' ? 'Vídeo' : 'Imagen'} · {formatearDuracion(e.duracionSegundos)}
                      {actual && ` · va en ${formatearDuracion(r.segundo)}`}
                    </span>
                    {actual && (
                      <div className="barra-mini">
                        <div style={{ width: `${r.porcentaje.toFixed(1)}%` }} />
                      </div>
                    )}
                  </div>
                  <span className={`chip${actual ? ' chip-en-linea' : ''}`}>
                    {!r ? 'En la lista' : actual ? 'Reproduciendo' : sigue ? 'Sigue' : reproducido ? 'Reproducido' : 'En cola'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <p className="suave">
        {r
          ? 'La pantalla informa el anuncio y el segundo en cada latido; entre latidos, la vista avanza sola.'
          : p.modoReproduccion === 'PaqueteLocal'
            ? 'En paquete local la pantalla no informa qué anuncio muestra.'
            : 'Cuando la pantalla esté en línea con la versión esperada, aquí se verá qué anuncio muestra.'}
      </p>
    </Dialogo>
  )
}
