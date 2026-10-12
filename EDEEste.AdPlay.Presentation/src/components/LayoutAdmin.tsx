import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'

interface Opcion {
  ruta: string
  texto: string
  soloAdministrador?: boolean
}

const opciones: Opcion[] = [
  { ruta: '/admin/supervision', texto: 'Supervisión' },
  { ruta: '/admin/sucursales', texto: 'Sucursales y grupos' },
  { ruta: '/admin/pantallas', texto: 'Pantallas' },
  { ruta: '/admin/multimedia', texto: 'Multimedia y anuncios' },
  { ruta: '/admin/listas', texto: 'Listas y publicación' },
  { ruta: '/admin/historial', texto: 'Historial' },
  { ruta: '/admin/usuarios', texto: 'Usuarios', soloAdministrador: true },
  { ruta: '/admin/auditoria', texto: 'Auditoría', soloAdministrador: true },
]

export function LayoutAdmin() {
  const { sesion, esAdministrador, cerrarSesion } = useAuth()

  return (
    <div className="panel">
      <nav className="panel-menu" aria-label="Administración">
        <div className="marca">
          EDEEste AdPlay
          <small>Señalización digital</small>
        </div>
        {opciones
          .filter((o) => !o.soloAdministrador || esAdministrador)
          .map((o) => (
            <NavLink key={o.ruta} to={o.ruta}>
              {o.texto}
            </NavLink>
          ))}

        <div className="panel-usuario">
          <NavLink to="/admin/cuenta" title="Mi cuenta">
            <strong>{sesion?.nombreCompleto}</strong>
            <small>{sesion?.rol}</small>
          </NavLink>
          <button className="mini" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </nav>
      <main className="panel-contenido">
        <Outlet />
      </main>
    </div>
  )
}
