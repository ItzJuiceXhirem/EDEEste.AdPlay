import { useState } from 'react'
import { AvisoError, Cargando, Insignia } from '../../components/Comunes'
import { Paginacion } from '../../components/Paginacion'
import { useDatos } from '../../hooks/useDatos'
import { auditoriaApi } from '../../services/consultasApi'
import { usuariosApi } from '../../services/sesionApi'
import type { AccionAuditoria } from '../../types/api'
import { formatearFecha, localAUtc } from '../../utils/formato'

const ACCIONES: { valor: AccionAuditoria; texto: string }[] = [
  { valor: 'IniciarSesion', texto: 'Inicio de sesión' },
  { valor: 'InicioSesionFallido', texto: 'Inicio de sesión fallido' },
  { valor: 'Crear', texto: 'Crear' },
  { valor: 'Editar', texto: 'Editar' },
  { valor: 'Habilitar', texto: 'Habilitar' },
  { valor: 'Deshabilitar', texto: 'Deshabilitar' },
  { valor: 'Eliminar', texto: 'Eliminar' },
  { valor: 'Archivar', texto: 'Archivar' },
  { valor: 'Restaurar', texto: 'Restaurar' },
  { valor: 'Publicar', texto: 'Publicar' },
  { valor: 'Retirar', texto: 'Retirar versión' },
  { valor: 'Exportar', texto: 'Exportar' },
  { valor: 'GenerarToken', texto: 'Generar token de pantalla' },
  { valor: 'RevocarToken', texto: 'Revocar token de pantalla' },
  { valor: 'CambiarClave', texto: 'Cambiar contraseña' },
  { valor: 'RestablecerClave', texto: 'Restablecer contraseña' },
]

const textoAccion = new Map(ACCIONES.map((a) => [a.valor, a.texto]))
const accionesDeRiesgo = new Set<AccionAuditoria>(['InicioSesionFallido', 'Eliminar', 'Retirar', 'Deshabilitar', 'RevocarToken'])

export function AuditoriaPage() {
  const usuarios = useDatos(() => usuariosApi.listar())
  const [filtro, setFiltro] = useState({ desde: '', hasta: '', usuarioId: '', accion: '' as AccionAuditoria | '', tipoEntidad: '' })
  const [pagina, setPagina] = useState(1)

  const consulta = {
    desde: localAUtc(filtro.desde) ?? undefined,
    hasta: localAUtc(filtro.hasta) ?? undefined,
    usuarioId: filtro.usuarioId ? Number(filtro.usuarioId) : undefined,
    accion: filtro.accion,
    tipoEntidad: filtro.tipoEntidad || undefined,
    pagina,
  }
  const registros = useDatos(() => auditoriaApi.listar(consulta), [JSON.stringify(consulta)])
  const datos = registros.datos

  const cambiar = (cambios: Partial<typeof filtro>) => {
    setFiltro({ ...filtro, ...cambios })
    setPagina(1)
  }

  return (
    <>
      <h1>Auditoría</h1>
      <AvisoError mensaje={registros.error} />

      <div className="filtros">
        <label className="campo">
          Desde
          <input type="datetime-local" value={filtro.desde} onChange={(e) => cambiar({ desde: e.target.value })} />
        </label>
        <label className="campo">
          Hasta
          <input type="datetime-local" value={filtro.hasta} onChange={(e) => cambiar({ hasta: e.target.value })} />
        </label>
        <label className="campo">
          Usuario
          <select value={filtro.usuarioId} onChange={(e) => cambiar({ usuarioId: e.target.value })}>
            <option value="">Todos</option>
            {(usuarios.datos ?? []).map((u) => <option key={u.id} value={u.id}>{u.nombreCompleto}</option>)}
          </select>
        </label>
        <label className="campo">
          Acción
          <select value={filtro.accion} onChange={(e) => cambiar({ accion: e.target.value as AccionAuditoria | '' })}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => <option key={a.valor} value={a.valor}>{a.texto}</option>)}
          </select>
        </label>
        <label className="campo">
          Tipo de elemento
          <input placeholder="Pantalla, Anuncio…" value={filtro.tipoEntidad} onChange={(e) => cambiar({ tipoEntidad: e.target.value })} />
        </label>
      </div>

      <section className="tarjeta">
        <Cargando activo={registros.cargando && !datos}>
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Elemento</th><th>Detalle</th></tr>
              </thead>
              <tbody>
                {(datos?.elementos ?? []).map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatearFecha(r.fechaUtc)}</td>
                    <td>{r.nombreUsuario ?? <span className="suave">—</span>}</td>
                    <td><Insignia tono={accionesDeRiesgo.has(r.accion) ? 'aviso' : undefined}>{textoAccion.get(r.accion) ?? r.accion}</Insignia></td>
                    <td>{r.tipoEntidad}{r.entidadId !== null && <span className="suave"> #{r.entidadId}</span>}</td>
                    <td>{r.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {datos?.elementos.length === 0 && <p className="suave">No hay registros con esos filtros.</p>}
          {datos && <Paginacion pagina={datos.pagina} tamanoPagina={datos.tamanoPagina} total={datos.total} alCambiar={setPagina} />}
        </Cargando>
      </section>
    </>
  )
}
