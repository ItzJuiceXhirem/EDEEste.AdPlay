import { useState } from 'react'
import { AvisoError, Insignia } from '../../../components/Comunes'
import { useAccion, useDatos } from '../../../hooks/useDatos'
import { useAuth } from '../../../hooks/useAuth'
import { publicacionesApi } from '../../../services/adminApi'
import type { PublicacionLista } from '../../../types/api'
import { descargarArchivo } from '../../../utils/descarga'
import { formatearFecha, formatearTamano } from '../../../utils/formato'

interface Props {
  publicaciones: PublicacionLista[]
  recargar: () => Promise<void>
}

/** Historial de versiones publicadas de una lista, con su retiro y la exportación a paquete ZIP. */
export function SeccionPublicaciones({ publicaciones, recargar }: Props) {
  const accion = useAccion()
  const { esAdministrador } = useAuth()

  const retirar = async (p: PublicacionLista) => {
    const confirmado = confirm(
      `¿Retirar la versión ${p.numeroVersion}? Los reproductores web pasarán a la versión publicada anterior.`,
    )
    if (confirmado && (await accion.ejecutar(() => publicacionesApi.retirar(p.id)))) {
      await recargar()
    }
  }

  return (
    <section className="tarjeta">
      <h2>Versiones publicadas</h2>
      <AvisoError mensaje={accion.error} />
      {publicaciones.length === 0 && <p className="suave">Todavía no se ha publicado ninguna versión.</p>}
      {publicaciones.map((p) => (
        <div key={p.id} style={{ borderTop: '1px solid var(--color-borde)', padding: '10px 0' }}>
          <div className="fila" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="fila" style={{ alignItems: 'center' }}>
              <strong>Versión {p.numeroVersion}</strong>
              {p.estadoPublicacion === 'Publicada' ? <Insignia tono="exito">Publicada</Insignia> : <Insignia>Retirada</Insignia>}
              <span className="suave">{formatearFecha(p.fechaPublicacionUtc)} · {p.elementos.length} elementos</span>
            </div>
            {esAdministrador && p.estadoPublicacion === 'Publicada' && (
              <button className="mini peligro" onClick={() => retirar(p)} disabled={accion.ocupado}>Retirar</button>
            )}
          </div>
          {p.estadoPublicacion === 'Publicada' && <Exportaciones publicacionId={p.id} />}
        </div>
      ))}
    </section>
  )
}

/** Las exportaciones se consultan solo cuando el usuario las abre, para no hacer una petición por cada versión publicada. */
function Exportaciones({ publicacionId }: { publicacionId: number }) {
  const [abierto, setAbierto] = useState(false)

  return abierto
    ? <PanelExportaciones publicacionId={publicacionId} />
    : <button className="mini" style={{ marginTop: 6 }} onClick={() => setAbierto(true)}>Paquetes ZIP…</button>
}

function PanelExportaciones({ publicacionId }: { publicacionId: number }) {
  const exportaciones = useDatos(() => publicacionesApi.exportaciones(publicacionId), [publicacionId])
  const accion = useAccion()

  const generar = async () => {
    if (await accion.ejecutar(() => publicacionesApi.exportar(publicacionId))) {
      await exportaciones.recargar()
    }
  }

  const ultima = exportaciones.datos?.[0]
  return (
    <div className="fila" style={{ marginTop: 6, alignItems: 'center' }}>
      <button className="mini" onClick={generar} disabled={accion.ocupado}>
        {accion.ocupado ? 'Generando…' : 'Generar paquete ZIP'}
      </button>
      {ultima?.estadoExportacion === 'Completada' && (
        <>
          <button
            className="mini"
            disabled={accion.ocupado}
            onClick={() => accion.ejecutar(() => descargarArchivo(publicacionesApi.rutaDescarga(ultima.id), 'paquete.zip'))}
          >
            Descargar ({formatearTamano(ultima.tamanoBytes)})
          </button>
          <span className="suave" title={ultima.hashPaquete ?? ''}>SHA-256 {ultima.hashPaquete?.slice(0, 12)}…</span>
        </>
      )}
      {ultima?.estadoExportacion === 'Fallida' && <Insignia tono="peligro">Falló: {ultima.detalleError}</Insignia>}
      <AvisoError mensaje={accion.error} />
    </div>
  )
}
