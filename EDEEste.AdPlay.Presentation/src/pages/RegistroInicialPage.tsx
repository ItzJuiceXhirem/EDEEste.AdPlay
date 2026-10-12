import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AvisoError } from '../components/Comunes'
import { LONGITUDES } from '../constants/limites'
import { useAuth } from '../hooks/useAuth'
import { useAccion, useDatos } from '../hooks/useDatos'
import { sesionApi } from '../services/sesionApi'

/**
 * Registro de primera vez: crea al administrador cuando el sistema aún no tiene usuarios. En cuanto existe
 * cualquier usuario la API lo rechaza y esta página redirige al inicio de sesión.
 */
export function RegistroInicialPage() {
  const { sesion, registrarAdministradorInicial } = useAuth()
  const navegar = useNavigate()
  const disponible = useDatos(() => sesionApi.registroInicialDisponible())
  const accion = useAccion()
  const [datos, setDatos] = useState({ correo: '', nombreCompleto: '', clave: '', confirmacion: '' })

  if (sesion) {
    return <Navigate to="/admin" replace />
  }
  if (disponible.datos === false) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  const coincide = datos.clave === datos.confirmacion

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await accion.ejecutar(() =>
      registrarAdministradorInicial(datos.correo.trim(), datos.nombreCompleto.trim(), datos.clave),
    )
    if (ok) {
      navegar('/admin', { replace: true })
    }
  }

  return (
    <main className="acceso">
      <form className="tarjeta acceso-formulario" onSubmit={enviar}>
        <h1>Crear la primera cuenta</h1>
        <p className="suave">
          El sistema todavía no tiene usuarios. Esta cuenta será <strong>administrador</strong>. Después de crearla,
          este registro se cierra y las demás cuentas las crea un administrador desde el panel.
        </p>
        <AvisoError mensaje={accion.error ?? disponible.error} />
        <label className="campo">
          Nombre
          <input required autoFocus maxLength={LONGITUDES.nombreCompleto} value={datos.nombreCompleto}
            onChange={(e) => setDatos({ ...datos, nombreCompleto: e.target.value })} />
        </label>
        <label className="campo">
          Correo
          <input type="email" required autoComplete="username" value={datos.correo}
            onChange={(e) => setDatos({ ...datos, correo: e.target.value })} />
        </label>
        <label className="campo">
          Contraseña
          <input type="password" required autoComplete="new-password" value={datos.clave}
            onChange={(e) => setDatos({ ...datos, clave: e.target.value })} />
        </label>
        <label className="campo">
          Repita la contraseña
          <input type="password" required autoComplete="new-password" value={datos.confirmacion}
            onChange={(e) => setDatos({ ...datos, confirmacion: e.target.value })} />
        </label>
        <span className="suave">Al menos 10 caracteres, con mayúscula, minúscula y número.</span>
        {datos.confirmacion && !coincide && (
          <span className="suave" style={{ color: 'var(--color-peligro)' }}>Las contraseñas no coinciden.</span>
        )}
        <button className="primario" disabled={accion.ocupado || !coincide}>
          {accion.ocupado ? 'Creando…' : 'Crear cuenta'}
        </button>
        <p className="suave"><Link to="/iniciar-sesion">Ya tengo una cuenta</Link></p>
      </form>
    </main>
  )
}
