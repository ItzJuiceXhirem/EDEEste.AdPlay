import { useCallback, useEffect, useMemo, useState } from 'react'
import { AvisoError, Buscador, CabeceraPagina, Esqueleto, Migas, Pestanas, Punto, Vacio } from '../../components/Comunes'
import { Icono } from '../../components/Icono'
import { useAhora, useProgresoEntrada } from '../../hooks/useAnimacion'
import { useAvisos } from '../../hooks/useAvisos'
import { useDatos } from '../../hooks/useDatos'
import { reportesApi } from '../../services/consultasApi'
import type { EstadoOperativoPantalla, EstadoPantallaReporte } from '../../types/api'
import { exportarCsv } from '../../utils/descarga'
import { coincideBusqueda, formatearFecha, hace, plural, versionCorta } from '../../utils/formato'
import './supervision.css'

/** Cada cuánto se actualiza la vista; es del orden del intervalo de latido de los reproductores. */
const INTERVALO_S = 15

type Filtro = 'todas' | 'enLinea' | 'desconectadas' | 'sinDatos' | 'alertas' | 'desactualizadas' | 'conError' | 'deshabilitadas'

const FILTROS: Record<Filtro, { texto: string; cumple: (p: EstadoPantallaReporte) => boolean }> = {
  todas: { texto: 'Todas', cumple: () => true },
  enLinea: { texto: 'En línea', cumple: (p) => p.estadoOperativo === 'EnLinea' },
  desconectadas: { texto: 'Desconectadas', cumple: (p) => p.estadoOperativo === 'Desconectada' },
  sinDatos: { texto: 'Sin datos', cumple: (p) => p.estadoOperativo === 'SinDatos' },
  alertas: { texto: 'Con alertas', cumple: (p) => p.actualizada === false || !!p.ultimoError },
  desactualizadas: { texto: 'Versión desactualizada', cumple: (p) => p.actualizada === false },
  conError: { texto: 'Con error informado', cumple: (p) => !!p.ultimoError },
  deshabilitadas: { texto: 'Deshabilitadas', cumple: (p) => !p.estaHabilitada },
}

const PESTANAS: Filtro[] = ['todas', 'enLinea', 'desconectadas', 'sinDatos', 'alertas']

const ESTADOS: Record<EstadoOperativoPantalla, { texto: string; clase: string; color: string }> = {
  EnLinea: { texto: 'En línea', clase: 'chip-en-linea', color: 'var(--estado-en-linea)' },
  Desconectada: { texto: 'Desconectada', clase: 'chip-desconectada', color: 'var(--estado-desconectada)' },
  SinDatos: { texto: 'Sin datos', clase: 'chip-sin-datos', color: 'var(--estado-sin-datos)' },
}

const METRICAS: { filtro: Filtro; texto: string; color: string; ayuda: string }[] = [
  { filtro: 'enLinea', texto: 'En línea', color: 'var(--estado-en-linea)', ayuda: 'Latido reciente' },
  { filtro: 'desconectadas', texto: 'Desconectadas', color: 'var(--estado-desconectada)', ayuda: 'Sin latido reciente' },
  { filtro: 'sinDatos', texto: 'Sin datos', color: 'var(--estado-sin-datos)', ayuda: 'Nunca han enviado latido' },
  { filtro: 'desactualizadas', texto: 'Desactualizadas', color: 'var(--estado-desactualizada)', ayuda: 'Reproducen una versión anterior' },
  { filtro: 'conError', texto: 'Con error', color: 'var(--estado-con-error)', ayuda: 'Informaron un error' },
  { filtro: 'deshabilitadas', texto: 'Deshabilitadas', color: 'var(--estado-deshabilitada)', ayuda: 'No reciben contenido' },
]

const esperar = (ms: number) => new Promise((resolver) => window.setTimeout(resolver, ms))

export function SupervisionPage() {
  const reporte = useDatos(() => reportesApi.estadoPantallas())
  const { recargar } = reporte
  const avisar = useAvisos()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [cerradas, setCerradas] = useState<Record<number, boolean>>({})
  const [inicioCiclo, setInicioCiclo] = useState(() => Date.now())
  const [refrescando, setRefrescando] = useState(false)
  const ahora = useAhora(1000)
  const progreso = useProgresoEntrada(reporte.datos ? 'listo' : 'cargando')

  const actualizar = useCallback(async () => {
    setInicioCiclo(Date.now())
    setRefrescando(true)
    // El destello de las filas dura lo mismo aunque la respuesta llegue antes.
    await Promise.all([recargar(), esperar(750)])
    setRefrescando(false)
  }, [recargar])

  useEffect(() => {
    const restante = Math.max(0, INTERVALO_S * 1000 - (Date.now() - inicioCiclo))
    const temporizador = window.setTimeout(() => void actualizar(), restante)
    return () => window.clearTimeout(temporizador)
  }, [inicioCiclo, actualizar])

  const filas = useMemo(() => reporte.datos ?? [], [reporte.datos])
  const contar = (f: Filtro) => filas.filter(FILTROS[f].cumple).length
  const total = filas.length
  const enLinea = contar('enLinea')
  const cantidadSucursales = new Set(filas.map((f) => f.sucursalId)).size

  const transcurrido = Math.min(INTERVALO_S, Math.floor((ahora - inicioCiclo) / 1000))
  const animado = (n: number) => Math.round(n * progreso)
  const fraccion = (n: number) => (total ? n / total : 0)

  const circunferencia = 2 * Math.PI * 52
  const segmentos = [
    { texto: plural(enLinea, 'en línea', 'en línea'), valor: enLinea, color: 'var(--estado-en-linea)' },
    { texto: plural(contar('desconectadas'), 'desconectada', 'desconectadas'), valor: contar('desconectadas'), color: 'var(--estado-desconectada)' },
    { texto: plural(contar('sinDatos'), 'sin datos', 'sin datos'), valor: contar('sinDatos'), color: 'var(--estado-sin-datos)' },
  ].map((s, i, todos) => {
    const largoDe = (valor: number) => fraccion(valor) * circunferencia * progreso
    const largo = largoDe(s.valor)
    const previo = todos.slice(0, i).reduce((t, x) => t + largoDe(x.valor), 0)
    return { ...s, dash: `${Math.max(0, largo - (s.valor > 0 ? 3 : 0))} ${circunferencia}`, offset: -previo }
  })

  const sucursales = useMemo(() => agrupar(filas.filter((p) => FILTROS[filtro].cumple(p)), busqueda), [filas, filtro, busqueda])
  const totalesPorSucursal = useMemo(() => {
    const mapa = new Map<number, EstadoPantallaReporte[]>()
    filas.forEach((f) => mapa.set(f.sucursalId, [...(mapa.get(f.sucursalId) ?? []), f]))
    return mapa
  }, [filas])

  const elegir = (f: Filtro) => setFiltro(filtro === f && f !== 'todas' ? 'todas' : f)

  const exportar = () => {
    const nombre = `estado-pantallas-${new Date().toISOString().slice(0, 10)}.csv`
    exportarCsv(
      nombre,
      ['Sucursal', 'Ubicación', 'Pantalla', 'Código', 'Modo', 'Habilitada', 'Estado', 'Último latido', 'Lista esperada', 'Versión esperada', 'Versión reportada', 'Actualizada', 'Último error'],
      filas.map((f) => [
        f.nombreSucursal,
        f.nombreGrupo,
        f.nombre,
        f.codigoPantalla,
        f.modoReproduccion === 'PaqueteLocal' ? 'Paquete local' : 'Navegador web',
        f.estaHabilitada ? 'Sí' : 'No',
        ESTADOS[f.estadoOperativo].texto,
        f.ultimaConexionUtc ? formatearFecha(f.ultimaConexionUtc) : '',
        f.nombreListaEsperada,
        f.numeroVersionEsperada != null ? `v${f.numeroVersionEsperada}` : '',
        f.versionReportada ? versionCorta(f.versionReportada) : '',
        f.actualizada === null ? '' : f.actualizada ? 'Sí' : 'No',
        f.ultimoError,
      ]),
    )
    avisar(`Se exportó ${nombre}`)
  }

  // Posición de cada fila entre todas las visibles, para escalonar su animación de entrada.
  const ordenFila = new Map(sucursales.flatMap((s) => s.grupos.flatMap((g) => g.pantallas)).map((p, i) => [p.pantallaId, i]))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Migas pagina="Supervisión" />
        <div className="chip chip-acento" style={{ height: 36, padding: '0 14px', gap: 10, fontSize: 12 }}>
          <span className="punto punto-acento" aria-hidden="true">
            <span className="punto-onda" />
            <span className="punto-centro" style={{ background: 'var(--acento)' }} />
          </span>
          <span>Actualización automática</span>
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="10" cy="10" r="8" fill="none" style={{ stroke: 'var(--borde)', strokeWidth: 2.5 }} />
            <circle
              className="anillo-cuenta"
              cx="10"
              cy="10"
              r="8"
              fill="none"
              strokeDasharray="50.27"
              strokeDashoffset={(50.27 * (transcurrido / INTERVALO_S)).toFixed(2)}
              style={{ stroke: 'var(--primario)', strokeWidth: 2.5, strokeLinecap: 'round' }}
            />
          </svg>
          <span className="solo-ancho tabular">{refrescando ? 'Actualizando…' : `Próxima en ${INTERVALO_S - transcurrido} s`}</span>
        </div>
      </div>

      <CabeceraPagina
        titulo="Supervisión de pantallas"
        descripcion={`Estado de cada pantalla según su último latido. La vista se actualiza sola cada ${INTERVALO_S} segundos.`}
      >
        <button className="boton boton-secundario" type="button" onClick={() => void actualizar()}>
          <Icono nombre="actualizar" className={refrescando ? 'girar' : undefined} />
          <span>Actualizar</span>
        </button>
        <button className="boton boton-primario" type="button" onClick={exportar} disabled={total === 0}>
          <Icono nombre="descargar" />
          <span>Exportar CSV</span>
        </button>
      </CabeceraPagina>

      <AvisoError mensaje={reporte.error} />

      <section aria-label="Resumen" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <button
          className="metrica entrada d1"
          type="button"
          onClick={() => setFiltro('todas')}
          style={{ flex: '1 1 300px', flexDirection: 'row', alignItems: 'center', gap: 22, padding: '22px 24px' }}
        >
          <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true" style={{ flex: 'none', transform: 'rotate(-90deg)' }}>
            <circle cx="64" cy="64" r="52" fill="none" style={{ stroke: 'var(--hundida)', strokeWidth: 14 }} />
            {segmentos.map((s) => (
              <circle
                key={s.color}
                cx="64"
                cy="64"
                r="52"
                fill="none"
                strokeDasharray={s.dash}
                strokeDashoffset={s.offset}
                style={{ stroke: s.color, strokeWidth: 14, transition: 'stroke-dasharray .6s, stroke-dashoffset .6s' }}
              />
            ))}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <span className="etiqueta">Pantallas registradas</span>
            <span className="metrica-numero" style={{ fontSize: 44, lineHeight: '48px' }}>
              {animado(total)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--pizarra)' }}>
              <strong style={{ color: 'var(--titulo)' }}>{Math.round(fraccion(enLinea) * 100 * progreso)}%</strong> en línea en{' '}
              {plural(cantidadSucursales, 'sucursal', 'sucursales')}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 4 }}>
              {segmentos.map((s) => (
                <span key={s.color} className="suave" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: s.color }} />
                  {s.texto}
                </span>
              ))}
            </div>
          </div>
        </button>

        <div style={{ flex: '999 1 560px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {METRICAS.map((m, i) => {
            const valor = contar(m.filtro)
            return (
              <button
                key={m.filtro}
                className={`metrica entrada${filtro === m.filtro ? ' seleccionada' : ''}`}
                type="button"
                onClick={() => elegir(m.filtro)}
                aria-pressed={filtro === m.filtro}
                style={{ animationDelay: `${(0.08 + i * 0.05).toFixed(2)}s` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className="etiqueta">{m.texto}</span>
                  <span className="punto-centro" style={{ width: 8, height: 8, background: m.color }} />
                </div>
                <span className="metrica-numero">{animado(valor)}</span>
                <div className="barra">
                  <div className="barra-relleno" style={{ width: `${(fraccion(valor) * 100 * progreso).toFixed(1)}%`, background: m.color }} />
                </div>
                <span className="suave">{m.ayuda}</span>
              </button>
            )
          })}
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Pestanas
            etiqueta="Filtrar por estado"
            valor={PESTANAS.includes(filtro) ? filtro : ('' as Filtro)}
            alCambiar={setFiltro}
            pestanas={PESTANAS.map((f) => ({ valor: f, texto: FILTROS[f].texto, cuenta: contar(f) }))}
          />
          {!PESTANAS.includes(filtro) && (
            <button className="chip-filtro" type="button" onClick={() => setFiltro('todas')} aria-label="Quitar filtro">
              <span>{FILTROS[filtro].texto}</span>
              <span className="equis" aria-hidden="true">
                <Icono nombre="cerrar" tamano={12} grosor={3} />
              </span>
            </button>
          )}
        </div>
        <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar pantalla" marcador="Buscar pantalla, código o ubicación" />
      </div>

      <div className={refrescando ? 'refrescando' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {reporte.cargando && !reporte.datos && <Esqueleto alto={180} cantidad={2} />}

        {reporte.datos && total === 0 && (
          <div className="tarjeta">
            <Vacio icono="pantalla" titulo="Todavía no hay pantallas">
              Registre la primera pantalla en Pantallas para empezar a supervisarla aquí.
            </Vacio>
          </div>
        )}

        {total > 0 && sucursales.length === 0 && (
          <div className="tarjeta">
            <Vacio
              icono="pantallaApagada"
              titulo="Ninguna pantalla coincide"
              accion={
                <button
                  className="boton boton-fantasma"
                  type="button"
                  onClick={() => {
                    setFiltro('todas')
                    setBusqueda('')
                  }}
                >
                  Ver todas las pantallas
                </button>
              }
            >
              Pruebe con otra búsqueda o quite el filtro de estado.
            </Vacio>
          </div>
        )}

        {sucursales.map((s, si) => {
          const todas = totalesPorSucursal.get(s.sucursalId) ?? []
          const visibles = s.grupos.reduce((n, g) => n + g.pantallas.length, 0)
          const caidas = todas.filter((p) => p.estadoOperativo === 'Desconectada').length
          const abierta = !cerradas[s.sucursalId]
          return (
            <section key={s.sucursalId} className={`tarjeta entrada${abierta ? '' : ' cerrada'}`} style={{ animationDelay: `${(0.2 + si * 0.08).toFixed(2)}s` }}>
              <button
                className="cabecera-sucursal"
                type="button"
                onClick={() => setCerradas({ ...cerradas, [s.sucursalId]: abierta })}
                aria-expanded={abierta}
              >
                <span
                  style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sutil)', color: 'var(--primario)' }}
                  aria-hidden="true"
                >
                  <Icono nombre="edificio" tamano={20} />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 240px', minWidth: 0 }}>
                  <span className="titulo-serif" style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>
                    {s.nombre}
                  </span>
                  <span className="suave">
                    {plural(visibles, 'pantalla', 'pantallas')}
                    {visibles !== todas.length && ` de ${todas.length}`}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="chip chip-en-linea">{todas.filter((p) => p.estadoOperativo === 'EnLinea').length} en línea</span>
                  {caidas > 0 && <span className="chip chip-desconectada">{plural(caidas, 'desconectada', 'desconectadas')}</span>}
                </span>
                <Icono nombre="abajo" tamano={20} className="cheuron" />
              </button>
              <div className="cuerpo-sucursal">
                <div>
                  {s.grupos.map((g) => (
                    <div key={g.grupoId} style={{ borderTop: '1px solid var(--hundida)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px 10px' }}>
                        <Icono nombre="ubicacion" tamano={16} style={{ color: 'var(--malva)' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--titulo)' }}>{g.nombre}</span>
                        <span className="suave">· {plural(g.pantallas.length, 'pantalla', 'pantallas')}</span>
                      </div>
                      <div className="tabla-caja">
                        <table className="tabla tabla-supervision" style={{ minWidth: 760 }}>
                          <thead>
                            <tr>
                              <th>Pantalla</th>
                              <th>Estado</th>
                              <th>Último latido</th>
                              <th>Debería reproducir</th>
                              <th>Reproduce</th>
                              <th>Observaciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.pantallas.map((p) => (
                              <FilaPantalla key={p.pantallaId} pantalla={p} ahora={ahora} retraso={`${((ordenFila.get(p.pantallaId) ?? 0) * 0.035 + 0.15).toFixed(3)}s`} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

function FilaPantalla({ pantalla: p, ahora, retraso }: { pantalla: EstadoPantallaReporte; ahora: number; retraso: string }) {
  const estado = ESTADOS[p.estadoOperativo]
  return (
    <tr className="fila" style={{ animationDelay: retraso }}>
      <td>
        <strong style={{ display: 'block', color: 'var(--titulo)', transition: 'color .2s' }}>{p.nombre}</strong>
        <span className="suave">
          {p.codigoPantalla}
          {!p.estaHabilitada && ' · deshabilitada'}
        </span>
      </td>
      <td>
        <span className={`chip ${estado.clase}`}>
          <Punto color={estado.color} vivo={p.estadoOperativo === 'EnLinea'} />
          {estado.texto}
        </span>
      </td>
      <td>
        <span className="tabular" title={p.ultimaConexionUtc ? new Date(p.ultimaConexionUtc).toLocaleString('es-DO') : 'Nunca se ha conectado'}>
          {hace(p.ultimaConexionUtc, ahora)}
        </span>
      </td>
      <td>
        {p.nombreListaEsperada ? (
          <>
            <span style={{ color: 'var(--titulo)' }}>{p.nombreListaEsperada}</span>{' '}
            {p.numeroVersionEsperada != null && <span className="suave">v{p.numeroVersionEsperada}</span>}
          </>
        ) : (
          <span className="suave">Sin contenido asignado</span>
        )}
      </td>
      <td className="tabular">{versionCorta(p.versionReportada)}</td>
      <td>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {p.actualizada === true && <span className="chip chip-neutro">Al día</span>}
          {p.actualizada === false && <span className="chip chip-desactualizada">Desactualizada</span>}
          {p.modoReproduccion === 'PaqueteLocal' && <span className="chip">Paquete local</span>}
          {!p.estaHabilitada && <span className="chip chip-deshabilitada">Deshabilitada</span>}
        </div>
        {p.ultimoError && (
          <div
            title={p.ultimoError}
            style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 6, maxWidth: 280, fontSize: 12, lineHeight: '16px', color: 'var(--peligro)' }}
          >
            <Icono nombre="advertencia" tamano={14} grosor={2.2} style={{ marginTop: 1 }} />
            <span>{p.ultimoError}</span>
          </div>
        )}
      </td>
    </tr>
  )
}

interface SucursalAgrupada {
  sucursalId: number
  nombre: string
  grupos: { grupoId: number; nombre: string; pantallas: EstadoPantallaReporte[] }[]
}

function agrupar(filas: EstadoPantallaReporte[], busqueda: string): SucursalAgrupada[] {
  const sucursales = new Map<number, SucursalAgrupada>()
  for (const p of filas) {
    if (!coincideBusqueda(busqueda, p.nombre, p.codigoPantalla, p.nombreGrupo, p.nombreSucursal)) {
      continue
    }
    const sucursal = sucursales.get(p.sucursalId) ?? { sucursalId: p.sucursalId, nombre: p.nombreSucursal, grupos: [] }
    let grupo = sucursal.grupos.find((g) => g.grupoId === p.grupoPantallaId)
    if (!grupo) {
      grupo = { grupoId: p.grupoPantallaId, nombre: p.nombreGrupo, pantallas: [] }
      sucursal.grupos.push(grupo)
    }
    grupo.pantallas.push(p)
    sucursales.set(p.sucursalId, sucursal)
  }
  return [...sucursales.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
