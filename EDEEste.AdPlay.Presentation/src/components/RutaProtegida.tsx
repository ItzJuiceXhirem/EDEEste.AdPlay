import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import type { Rol } from '../types/api'
import { Icono } from './Icono'

interface Props {
  /** Si se indica, solo estos roles acceden; los demás vuelven al inicio del panel. */
  roles?: Rol[]
}

/** Exige sesión (y opcionalmente un rol) para mostrar las rutas hijas. */
export function RutaProtegida({ roles }: Props) {
  const { sesion, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) {
    return (
      <div className="suave" role="status" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14 }}>
        <Icono nombre="cargando" className="girar" grosor={2.4} style={{ color: 'var(--coral)' }} />
        Comprobando sesión…
      </div>
    )
  }
  if (!sesion) {
    return <Navigate to="/iniciar-sesion" replace state={{ desde: ubicacion.pathname }} />
  }
  if (roles && !roles.includes(sesion.rol)) {
    return <Navigate to="/admin" replace />
  }
  return <Outlet />
}
