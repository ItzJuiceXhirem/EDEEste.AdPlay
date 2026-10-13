import { useState, type FormEvent } from 'react'
import { AvisoError } from '../../components/Comunes'
import { useAccion } from '../../hooks/useDatos'
import { useAuth } from '../../hooks/useAuth'
import { sesionApi } from '../../services/sesionApi'

export function CuentaPage() {
  const { sesion } = useAuth()
  const accion = useAccion()
  const [claveActual, setClaveActual] = useState('')
  const [nuevaClave, setNuevaClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [cambiada, setCambiada] = useState(false)

  const coincide = nuevaClave === confirmacion

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setCambiada(false)
    if (await accion.ejecutar(() => sesionApi.cambiarClave(claveActual, nuevaClave))) {
      setClaveActual('')
      setNuevaClave('')
      setConfirmacion('')
      setCambiada(true)
    }
  }

  return (
    <>
      <h1>Mi cuenta</h1>
      <section className="tarjeta">
        <p><strong>{sesion?.nombreCompleto}</strong><br /><span className="suave">{sesion?.correo} · {sesion?.rol}</span></p>
      </section>

      <section className="tarjeta" style={{ maxWidth: 420 }}>
        <h2>Cambiar contraseña</h2>
        <AvisoError mensaje={accion.error} />
        {cambiada && <div className="aviso info">La contraseña se cambió correctamente.</div>}
        <form onSubmit={enviar} style={{ display: 'grid', gap: 10 }}>
          <label className="campo">
            Contraseña actual
            <input type="password" required autoComplete="current-password" value={claveActual} onChange={(e) => setClaveActual(e.target.value)} />
          </label>
          <label className="campo">
            Nueva contraseña
            <input type="password" required autoComplete="new-password" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} />
          </label>
          <label className="campo">
            Repita la nueva contraseña
            <input type="password" required autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          </label>
          {confirmacion && !coincide && <span className="suave" style={{ color: 'var(--color-peligro)' }}>Las contraseñas no coinciden.</span>}
          <div><button className="primario" disabled={accion.ocupado || !coincide}>Cambiar contraseña</button></div>
        </form>
      </section>
    </>
  )
}
