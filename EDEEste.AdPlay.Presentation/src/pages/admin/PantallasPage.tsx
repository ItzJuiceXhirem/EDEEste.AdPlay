import { useState, type FormEvent } from 'react'
import { AvisoError, Cargando, Insignia } from '../../components/Comunes'
import { LONGITUDES } from '../../constants/limites'
import { useAccion, useDatos } from '../../hooks/useDatos'
import { useAuth } from '../../hooks/useAuth'
import { gruposPantallasApi, pantallasApi, sucursalesApi } from '../../services/adminApi'
import type { EstadoOperativoPantalla, ModoReproduccion, Pantalla } from '../../types/api'
import { formatearFecha } from '../../utils/formato'

const textoEstado: Record<EstadoOperativoPantalla, { texto: string; tono?: 'exito' | 'peligro' }> = {
  EnLinea: { texto: 'En línea', tono: 'exito' },
  Desconectada: { texto: 'Desconectada', tono: 'peligro' },
  SinDatos: { texto: 'Sin datos' },
}

const formularioVacio = { codigoPantalla: '', nombre: '', modelo: '', grupoPantallaId: '', modoReproduccion: 'NavegadorWeb' as ModoReproduccion }

export function PantallasPage() {
  const { esAdministrador } = useAuth()
  const [sucursalId, setSucursalId] = useState('')
  const sucursales = useDatos(() => sucursalesApi.listar())
  const grupos = useDatos(() => gruposPantallasApi.listar())
  const pantallas = useDatos(
    () => pantallasApi.listar({ sucursalId: sucursalId ? Number(sucursalId) : undefined }),
    [sucursalId],
  )
  const accion = useAccion()
  const [formulario, setFormulario] = useState(formularioVacio)
  const [tokenGenerado, setTokenGenerado] = useState<{ pantalla: string; url: string } | null>(null)

  const registrar = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await accion.ejecutar(() =>
      pantallasApi.registrar({ ...formulario, modelo: formulario.modelo || null, grupoPantallaId: Number(formulario.grupoPantallaId) }),
    )
    if (ok) {
      setFormulario(formularioVacio)
      await pantallas.recargar()
    }
  }

  const actualizar = async (p: Pantalla, cambios: Parameters<typeof pantallasApi.actualizar>[1]) => {
    if (await accion.ejecutar(() => pantallasApi.actualizar(p.id, cambios))) {
      await pantallas.recargar()
    }
  }

  const generarToken = async (p: Pantalla) => {
    if (p.tieneTokenDispositivo && !confirm(`La pantalla "${p.nombre}" ya tiene un token. Generar otro invalida el anterior. ¿Continuar?`)) {
      return
    }
    await accion.ejecutar(async () => {
      const { token } = await pantallasApi.generarToken(p.id)
      setTokenGenerado({ pantalla: p.nombre, url: `${window.location.origin}/reproductor?token=${encodeURIComponent(token)}` })
      await pantallas.recargar()
    })
  }

  return (
    <>
      <h1>Pantallas</h1>
      <AvisoError mensaje={accion.error ?? pantallas.error} />
      {tokenGenerado && (
        <div className="aviso info">
          <strong>Enlace del reproductor para “{tokenGenerado.pantalla}”</strong> (se muestra una sola vez; ábralo en el
          navegador del televisor):
          <div style={{ marginTop: 6 }}><code>{tokenGenerado.url}</code></div>
          <div className="fila" style={{ marginTop: 8 }}>
            <button className="mini" onClick={() => navigator.clipboard?.writeText(tokenGenerado.url)}>Copiar</button>
            <button className="mini" onClick={() => setTokenGenerado(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {esAdministrador && (
      <section className="tarjeta">
        <h2>Registrar pantalla</h2>
        <form className="fila" onSubmit={registrar}>
          <label className="campo">
            Código
            <input required maxLength={LONGITUDES.codigoPantalla} value={formulario.codigoPantalla}
              onChange={(e) => setFormulario({ ...formulario, codigoPantalla: e.target.value })} />
          </label>
          <label className="campo">
            Nombre
            <input required maxLength={LONGITUDES.nombre} value={formulario.nombre}
              onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} />
          </label>
          <label className="campo">
            Modelo
            <input maxLength={LONGITUDES.nombre} value={formulario.modelo}
              onChange={(e) => setFormulario({ ...formulario, modelo: e.target.value })} />
          </label>
          <label className="campo">
            Ubicación (grupo)
            <select required value={formulario.grupoPantallaId}
              onChange={(e) => setFormulario({ ...formulario, grupoPantallaId: e.target.value })}>
              <option value="">Seleccione…</option>
              {(grupos.datos ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.nombreSucursal} › {g.nombre}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Modo
            <select value={formulario.modoReproduccion}
              onChange={(e) => setFormulario({ ...formulario, modoReproduccion: e.target.value as ModoReproduccion })}>
              <option value="NavegadorWeb">Navegador web</option>
              <option value="PaqueteLocal">Paquete local</option>
            </select>
          </label>
          <button className="primario" disabled={accion.ocupado}>Registrar</button>
        </form>
      </section>
      )}

      <section className="tarjeta">
        <div className="fila" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Pantallas registradas</h2>
          <label className="campo">
            Sucursal
            <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
              <option value="">Todas</option>
              {(sucursales.datos ?? []).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
        </div>
        <Cargando activo={pantallas.cargando}>
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr>
                  <th>Pantalla</th>
                  <th>Ubicación</th>
                  <th>Modo</th>
                  <th>Habilitada</th>
                  <th>Estado</th>
                  <th>Último latido</th>
                  <th>Versión</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(pantallas.datos ?? []).map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.nombre}</strong><div className="suave">{p.codigoPantalla}</div></td>
                    <td>{p.nombreSucursal} › {p.nombreGrupo}</td>
                    <td>
                      <select value={p.modoReproduccion} disabled={accion.ocupado || !esAdministrador}
                        onChange={(e) => actualizar(p, { modoReproduccion: e.target.value as ModoReproduccion })}>
                        <option value="NavegadorWeb">Navegador web</option>
                        <option value="PaqueteLocal">Paquete local</option>
                      </select>
                    </td>
                    <td>
                      <label className="casilla">
                        <input type="checkbox" checked={p.estaHabilitada} disabled={accion.ocupado || !esAdministrador}
                          onChange={() => actualizar(p, { estaHabilitada: !p.estaHabilitada })} />
                        {p.estaHabilitada ? 'Sí' : 'No'}
                      </label>
                    </td>
                    <td>
                      <Insignia tono={textoEstado[p.estadoOperativo].tono}>{textoEstado[p.estadoOperativo].texto}</Insignia>
                      {p.ultimoError && <div className="suave" title={p.ultimoError}>⚠ {p.ultimoError.slice(0, 40)}</div>}
                    </td>
                    <td>{formatearFecha(p.ultimaConexionUtc)}</td>
                    <td>{p.ultimaVersionReportada ?? '—'}</td>
                    <td>
                      {esAdministrador && (
                        <button className="mini" onClick={() => generarToken(p)} disabled={accion.ocupado}>
                          {p.tieneTokenDispositivo ? 'Rotar token' : 'Generar token'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pantallas.datos?.length === 0 && <p className="suave">No hay pantallas registradas.</p>}
          </div>
        </Cargando>
        <p className="suave">
          En modo paquete local, deshabilitar la pantalla no borra los archivos ya copiados; el cambio llega cuando se
          sincroniza un paquete nuevo.
        </p>
      </section>
    </>
  )
}
