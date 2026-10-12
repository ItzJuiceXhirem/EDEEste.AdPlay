import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import type { Rol } from '../types/api'

interface Props {
  /** Si se indica, solo estos roles acceden; los demás vuelven al inicio del panel. */
  roles?: Rol[]
}

/** Exige sesión (y opcionalmente un rol) para mostrar las rutas hijas. */
export function RutaProtegida({ roles }: Props) {
  const { sesion, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) {
    return <p className="suave" style={{ padding: 24 }}>Comprobando sesión…</p>
  }
  if (!sesion) {
    return <Navigate to="/iniciar-sesion" replace state={{ desde: ubicacion.pathname }} />
  }
  if (roles && !roles.includes(sesion.rol)) {
    return <Navigate to="/admin" replace />
  }
  return <Outlet />
}
