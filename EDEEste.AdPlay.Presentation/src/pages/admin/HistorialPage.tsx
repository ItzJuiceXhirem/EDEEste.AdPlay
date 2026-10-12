import { useState } from 'react'
import { AvisoError, Cargando, Insignia } from '../../components/Comunes'
import { Paginacion } from '../../components/Paginacion'
import { useAccion, useDatos } from '../../hooks/useDatos'
import { listasApi, publicacionesApi } from '../../services/adminApi'
import { historialApi } from '../../services/consultasApi'
import { descargarArchivo } from '../../utils/descarga'
import { formatearFecha, formatearTamano } from '../../utils/formato'

type Pestana = 'publicaciones' | 'exportaciones'

export function HistorialPage() {
  const [pestana, setPestana] = useState<Pestana>('publicaciones')
  const [listaId, setListaId] = useState('')
  const [pagina, setPagina] = useState(1)
  const listas = useDatos(() => listasApi.listar())

  const filtro = { listaReproduccionId: listaId ? Number(listaId) : undefined, pagina }

  const cambiarFiltro = (nuevaLista: string) => {
    setListaId(nuevaLista)
    setPagina(1)
  }

  return (
    <>
      <h1>Historial</h1>
      <div className="pestanas">
        {(['publicaciones', 'exportaciones'] as const).map((p) => (
          <button key={p} className={pestana === p ? 'activa' : ''} onClick={() => { setPestana(p); setPagina(1) }}>
            {p === 'publicaciones' ? 'Publicaciones' : 'Exportaciones'}
          </button>
        ))}
      </div>

      <div className="filtros">
        <label className="campo">
          Lista
          <select value={listaId} onChange={(e) => cambiarFiltro(e.target.value)}>
            <option value="">Todas</option>
            {(listas.datos ?? []).map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </label>
      </div>

      <section className="tarjeta">
        {pestana === 'publicaciones'
          ? <TablaPublicaciones filtro={filtro} alPaginar={setPagina} />
          : <TablaExportaciones filtro={filtro} alPaginar={setPagina} />}
      </section>
    </>
  )
}

interface PropsTabla {
  filtro: { listaReproduccionId?: number; pagina: number }
  alPaginar: (pagina: number) => void
}

function TablaPublicaciones({ filtro, alPaginar }: PropsTabla) {
  const datos = useDatos(() => historialApi.publicaciones(filtro), [filtro.listaReproduccionId, filtro.pagina])
  const pagina = datos.datos

  return (
    <>
      <AvisoError mensaje={datos.error} />
      <Cargando activo={datos.cargando && !pagina}>
        <div className="tabla-desplazable">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Lista</th><th>Versión</th><th>Elementos</th><th>Publicó</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {(pagina?.elementos ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{formatearFecha(p.fechaPublicacionUtc)}</td>
                  <td>{p.nombreLista}</td>
                  <td>v{p.numeroVersion}</td>
                  <td>{p.cantidadElementos}</td>
                  <td>{p.usuarioPublicador ?? <span className="suave">—</span>}</td>
                  <td>{p.estadoPublicacion === 'Publicada' ? <Insignia tono="exito">Publicada</Insignia> : <Insignia>Retirada</Insignia>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagina?.elementos.length === 0 && <p className="suave">No hay publicaciones.</p>}
        {pagina && <Paginacion pagina={pagina.pagina} tamanoPagina={pagina.tamanoPagina} total={pagina.total} alCambiar={alPaginar} />}
      </Cargando>
    </>
  )
}

function TablaExportaciones({ filtro, alPaginar }: PropsTabla) {
  const datos = useDatos(() => historialApi.exportaciones(filtro), [filtro.listaReproduccionId, filtro.pagina])
  const accion = useAccion()
  const pagina = datos.datos

  return (
    <>
      <AvisoError mensaje={datos.error ?? accion.error} />
      <Cargando activo={datos.cargando && !pagina}>
        <div className="tabla-desplazable">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Lista</th><th>Versión</th><th>Solicitó</th><th>Tamaño</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {(pagina?.elementos ?? []).map((e) => (
                <tr key={e.id}>
                  <td>{formatearFecha(e.fechaSolicitudUtc)}</td>
                  <td>{e.nombreLista}</td>
                  <td>v{e.numeroVersion}</td>
                  <td>{e.usuarioSolicitante ?? <span className="suave">—</span>}</td>
                  <td>{formatearTamano(e.tamanoBytes)}</td>
                  <td>
                    {e.estadoExportacion === 'Completada' && <Insignia tono="exito">Completada</Insignia>}
                    {e.estadoExportacion === 'Fallida' && <Insignia tono="peligro">Falló</Insignia>}
                    {(e.estadoExportacion === 'Pendiente' || e.estadoExportacion === 'Generando') && <Insignia tono="aviso">{e.estadoExportacion}</Insignia>}
                  </td>
                  <td>
                    {e.estadoExportacion === 'Completada' && (
                      <button
                        className="mini"
                        disabled={accion.ocupado}
                        onClick={() => accion.ejecutar(() => descargarArchivo(publicacionesApi.rutaDescarga(e.id), `AdPlay_v${e.numeroVersion}.zip`))}
                      >
                        Descargar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagina?.elementos.length === 0 && <p className="suave">No hay exportaciones.</p>}
        {pagina && <Paginacion pagina={pagina.pagina} tamanoPagina={pagina.tamanoPagina} total={pagina.total} alCambiar={alPaginar} />}
      </Cargando>
    </>
  )
}
