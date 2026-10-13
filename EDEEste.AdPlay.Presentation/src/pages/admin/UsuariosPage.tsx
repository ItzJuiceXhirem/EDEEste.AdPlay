import { useState, type FormEvent } from 'react'
import { AvisoError, Cargando, Insignia } from '../../components/Comunes'
import { LONGITUDES } from '../../constants/limites'
import { ROLES } from '../../constants/seguridad'
import { useAccion, useDatos } from '../../hooks/useDatos'
import { useAuth } from '../../hooks/useAuth'
import { usuariosApi } from '../../services/sesionApi'
import type { Rol, Usuario } from '../../types/api'
import { formatearFecha } from '../../utils/formato'

const formularioVacio = { correo: '', nombreCompleto: '', rol: ROLES.operador as Rol, clave: '' }

export function UsuariosPage() {
  const { sesion } = useAuth()
  const usuarios = useDatos(() => usuariosApi.listar())
  const accion = useAccion()
  const [formulario, setFormulario] = useState(formularioVacio)
  const [restableciendo, setRestableciendo] = useState<{ id: number; clave: string } | null>(null)

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    if (await accion.ejecutar(() => usuariosApi.crear(formulario))) {
      setFormulario(formularioVacio)
      await usuarios.recargar()
    }
  }

  const actualizar = async (u: Usuario, cambios: Partial<Pick<Usuario, 'rol' | 'estaActivo'>>) => {
    const ok = await accion.ejecutar(() =>
      usuariosApi.actualizar(u.id, { nombreCompleto: u.nombreCompleto, rol: u.rol, estaActivo: u.estaActivo, ...cambios }),
    )
    if (ok) {
      await usuarios.recargar()
    }
  }

  const restablecer = async (e: FormEvent) => {
    e.preventDefault()
    if (restableciendo && (await accion.ejecutar(() => usuariosApi.restablecerClave(restableciendo.id, restableciendo.clave)))) {
      setRestableciendo(null)
    }
  }

  return (
    <>
      <h1>Usuarios</h1>
      <AvisoError mensaje={accion.error ?? usuarios.error} />

      <section className="tarjeta">
        <h2>Nuevo usuario</h2>
        <form className="fila" onSubmit={crear}>
          <label className="campo">
            Correo
            <input type="email" required maxLength={256} autoComplete="off" value={formulario.correo}
              onChange={(e) => setFormulario({ ...formulario, correo: e.target.value })} />
          </label>
          <label className="campo">
            Nombre
            <input required maxLength={LONGITUDES.nombreCompleto} value={formulario.nombreCompleto}
              onChange={(e) => setFormulario({ ...formulario, nombreCompleto: e.target.value })} />
          </label>
          <label className="campo">
            Rol
            <select value={formulario.rol} onChange={(e) => setFormulario({ ...formulario, rol: e.target.value as Rol })}>
              <option value={ROLES.operador}>Operador</option>
              <option value={ROLES.administrador}>Administrador</option>
            </select>
          </label>
          <label className="campo">
            Contraseña inicial
            <input type="password" required autoComplete="new-password" value={formulario.clave}
              onChange={(e) => setFormulario({ ...formulario, clave: e.target.value })} />
          </label>
          <button className="primario" disabled={accion.ocupado}>Crear</button>
        </form>
        <p className="suave">
          La contraseña debe tener al menos 10 caracteres, con mayúscula, minúscula y número. El operador prepara
          contenido y exporta paquetes; solo el administrador asigna, publica y gestiona usuarios.
        </p>
      </section>

      {restableciendo && (
        <section className="tarjeta">
          <form className="fila" onSubmit={restablecer}>
            <label className="campo">
              Nueva contraseña para {usuarios.datos?.find((u) => u.id === restableciendo.id)?.correo}
              <input type="password" required autoFocus autoComplete="new-password" value={restableciendo.clave}
                onChange={(e) => setRestableciendo({ ...restableciendo, clave: e.target.value })} />
            </label>
            <button className="primario" disabled={accion.ocupado}>Restablecer</button>
            <button type="button" onClick={() => setRestableciendo(null)}>Cancelar</button>
          </form>
        </section>
      )}

      <section className="tarjeta">
        <Cargando activo={usuarios.cargando}>
          <div className="tabla-desplazable">
            <table>
              <thead>
                <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th></tr>
              </thead>
              <tbody>
                {(usuarios.datos ?? []).map((u) => {
                  const esYo = u.id === sesion?.id
                  return (
                    <tr key={u.id}>
                      <td><strong>{u.nombreCompleto}</strong>{esYo && ' (usted)'}<div className="suave">{u.correo}</div></td>
                      <td>
                        <select value={u.rol} disabled={accion.ocupado} onChange={(e) => actualizar(u, { rol: e.target.value as Rol })}>
                          <option value={ROLES.operador}>Operador</option>
                          <option value={ROLES.administrador}>Administrador</option>
                        </select>
                      </td>
                      <td>{u.estaActivo ? <Insignia tono="exito">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</td>
                      <td>{formatearFecha(u.fechaCreacionUtc)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="mini" disabled={accion.ocupado || (esYo && u.estaActivo)}
                          title={esYo ? 'No puede desactivar su propia cuenta' : undefined}
                          onClick={() => actualizar(u, { estaActivo: !u.estaActivo })}>
                          {u.estaActivo ? 'Desactivar' : 'Activar'}
                        </button>{' '}
                        <button className="mini" onClick={() => setRestableciendo({ id: u.id, clave: '' })}>Restablecer clave</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Cargando>
      </section>
    </>
  )
}
