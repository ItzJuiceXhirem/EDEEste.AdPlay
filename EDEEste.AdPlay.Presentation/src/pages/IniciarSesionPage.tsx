import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { AvisoError } from '../components/Comunes'
import { useAccion } from '../hooks/useDatos'
import { useAuth } from '../hooks/useAuth'

export function IniciarSesionPage() {
  const { sesion, cargando, iniciarSesion } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const accion = useAccion()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')

  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/admin'
  if (sesion && !cargando) {
    return <Navigate to={destino} replace />
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (await accion.ejecutar(() => iniciarSesion(correo.trim(), clave))) {
      navegar(destino, { replace: true })
    }
  }

  return (
    <main className="acceso">
      <form className="tarjeta acceso-formulario" onSubmit={enviar}>
        <h1>EDEEste AdPlay</h1>
        <p className="suave">Inicie sesión para administrar los anuncios.</p>
        <AvisoError mensaje={accion.error} />
        <label className="campo">
          Correo
          <input type="email" required autoFocus autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label className="campo">
          Contraseña
          <input type="password" required autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        <button className="primario" disabled={accion.ocupado}>{accion.ocupado ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  )
}
