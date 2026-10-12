import { useEffect, useMemo } from 'react'
import { AvisoError, Cargando, Insignia } from '../../components/Comunes'
import { useDatos } from '../../hooks/useDatos'
import { reportesApi } from '../../services/consultasApi'
import type { EstadoOperativoPantalla, EstadoPantallaReporte } from '../../types/api'
import { exportarCsv } from '../../utils/descarga'
import { formatearFecha } from '../../utils/formato'

/** Cada cuánto se actualiza la vista; es del orden del intervalo de latido de los reproductores. */
const ACTUALIZAR_CADA_MS = 15_000

const textoEstado: Record<EstadoOperativoPantalla, { texto: string; tono?: 'exito' | 'peligro' }> = {
  EnLinea: { texto: 'En línea', tono: 'exito' },
  Desconectada: { texto: 'Desconectada', tono: 'peligro' },
  SinDatos: { texto: 'Sin datos' },
}

export function SupervisionPage() {
  const reporte = useDatos(() => reportesApi.estadoPantallas())
  const { recargar } = reporte

  useEffect(() => {
    const temporizador = window.setInterval(() => void recargar(), ACTUALIZAR_CADA_MS)
    return () => window.clearInterval(temporizador)
  }, [recargar])

  const filas = useMemo(() => reporte.datos ?? [], [reporte.datos])
  const resumen = useMemo(
    () => ({
      total: filas.length,
      enLinea: filas.filter((f) => f.estadoOperativo === 'EnLinea').length,
      desconectadas: filas.filter((f) => f.estadoOperativo === 'Desconectada').length,
      sinDatos: filas.filter((f) => f.estadoOperativo === 'SinDatos').length,
      deshabilitadas: filas.filter((f) => !f.estaHabilitada).length,
      desactualizadas: filas.filter((f) => f.actualizada === false).length,
      conError: filas.filter((f) => f.ultimoError).length,
    }),
    [filas],
  )

  const porSucursal = useMemo(() => agrupar(filas), [filas])

  const exportar = () =>
    exportarCsv(
      `estado-pantallas-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Sucursal', 'Ubicación', 'Pantalla', 'Código', 'Modo', 'Habilitada', 'Estado', 'Último latido', 'Lista esperada', 'Versión esperada', 'Versión reportada', 'Actualizada', 'Último error'],
      filas.map((f) => [
        f.nombreSucursal,
        f.nombreGrupo,
        f.nombre,
        f.codigoPantalla,
        f.modoReproduccion,
        f.estaHabilitada ? 'Sí' : 'No',
        textoEstado[f.estadoOperativo].texto,
        f.ultimaConexionUtc ? formatearFecha(f.ultimaConexionUtc) : '',
        f.nombreListaEsperada,
        f.versionEsperada,
        f.versionReportada,
        f.actualizada === null ? '' : f.actualizada ? 'Sí' : 'No',
        f.ultimoError,
      ]),
    )

  return (
    <>
      <div className="fila" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Supervisión de pantallas</h1>
        <div className="fila">
          <button onClick={() => void recargar()}>Actualizar</button>
          <button onClick={exportar} disabled={filas.length === 0}>Exportar CSV</button>
        </div>
      </div>
      <AvisoError mensaje={reporte.error} />
      <p className="suave">Se actualiza solo cada {ACTUALIZAR_CADA_MS / 1000} segundos.</p>

      <div className="resumen">
        <Indicador valor={resumen.total} texto="Pantallas" />
        <Indicador valor={resumen.enLinea} texto="En línea" tono="exito" />
        <Indicador valor={resumen.desconectadas} texto="Desconectadas" tono="peligro" />
        <Indicador valor={resumen.sinDatos} texto="Sin datos" />
        <Indicador valor={resumen.desactualizadas} texto="Con versión desactualizada" tono="aviso" />
        <Indicador valor={resumen.conError} texto="Con error informado" tono="peligro" />
        <Indicador valor={resumen.deshabilitadas} texto="Deshabilitadas" />
      </div>

      <Cargando activo={reporte.cargando}>
        {porSucursal.length === 0 && <p className="suave">No hay pantallas registradas.</p>}
        {porSucursal.map(({ sucursal, grupos }) => (
          <section className="tarjeta" key={sucursal}>
            <h2>{sucursal}</h2>
            {grupos.map(({ grupo, pantallas }) => (
              <div className="grupo-supervision" key={grupo}>
                <h3>{grupo}</h3>
                <div className="tabla-desplazable">
                  <table>
                    <thead>
                      <tr>
                        <th>Pantalla</th><th>Estado</th><th>Último latido</th><th>Debería reproducir</th><th>Reproduce</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pantallas.map((p) => (
                        <tr key={p.pantallaId}>
                          <td>
                            <strong>{p.nombre}</strong>
                            <div className="suave">{p.codigoPantalla}{!p.estaHabilitada && ' · deshabilitada'}</div>
                          </td>
                          <td><Insignia tono={textoEstado[p.estadoOperativo].tono}>{textoEstado[p.estadoOperativo].texto}</Insignia></td>
                          <td>{formatearFecha(p.ultimaConexionUtc)}</td>
                          <td>{p.nombreListaEsperada ? `${p.nombreListaEsperada} (v${p.versionEsperada})` : <span className="suave">Sin contenido</span>}</td>
                          <td>{p.versionReportada ?? <span className="suave">—</span>}</td>
                          <td>
                            {p.actualizada === true && <Insignia tono="exito">Al día</Insignia>}
                            {p.actualizada === false && <Insignia tono="aviso">Desactualizada</Insignia>}
                            {p.modoReproduccion === 'PaqueteLocal' && <Insignia>Paquete local</Insignia>}
                            {p.ultimoError && <div className="suave" title={p.ultimoError}>⚠ {p.ultimoError.slice(0, 50)}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        ))}
      </Cargando>
    </>
  )
}

function Indicador({ valor, texto, tono }: { valor: number; texto: string; tono?: 'exito' | 'peligro' | 'aviso' }) {
  return (
    <div className={`indicador ${tono ?? ''}`}>
      <strong>{valor}</strong>
      <span>{texto}</span>
    </div>
  )
}

function agrupar(filas: EstadoPantallaReporte[]) {
  const sucursales = new Map<string, Map<string, EstadoPantallaReporte[]>>()
  for (const fila of filas) {
    const grupos = sucursales.get(fila.nombreSucursal) ?? new Map<string, EstadoPantallaReporte[]>()
    grupos.set(fila.nombreGrupo, [...(grupos.get(fila.nombreGrupo) ?? []), fila])
    sucursales.set(fila.nombreSucursal, grupos)
  }
  return [...sucursales].map(([sucursal, grupos]) => ({
    sucursal,
    grupos: [...grupos].map(([grupo, pantallas]) => ({ grupo, pantallas })),
  }))
}
