import { Navigate, Route, Routes } from 'react-router'
import { LayoutAdmin } from './components/LayoutAdmin'
import { RutaProtegida } from './components/RutaProtegida'
import { SOLO_ADMINISTRADOR } from './constants/seguridad'
import { IniciarSesionPage } from './pages/IniciarSesionPage'
import { RegistroInicialPage } from './pages/RegistroInicialPage'
import { AuditoriaPage } from './pages/admin/AuditoriaPage'
import { CuentaPage } from './pages/admin/CuentaPage'
import { HistorialPage } from './pages/admin/HistorialPage'
import { ListasPage } from './pages/admin/listas/ListasPage'
import { MultimediaPage } from './pages/admin/MultimediaPage'
import { PantallasPage } from './pages/admin/PantallasPage'
import { SucursalesPage } from './pages/admin/SucursalesPage'
import { SupervisionPage } from './pages/admin/SupervisionPage'
import { UsuariosPage } from './pages/admin/UsuariosPage'
import { ReproductorPage } from './pages/reproductor/ReproductorPage'

export default function App() {
  return (
    <Routes>
      {/* El reproductor se autentica con el token de su pantalla, no con una sesión de usuario. */}
      <Route path="/reproductor" element={<ReproductorPage />} />
      <Route path="/iniciar-sesion" element={<IniciarSesionPage />} />
      <Route path="/registro" element={<RegistroInicialPage />} />

      <Route element={<RutaProtegida />}>
        <Route path="/admin" element={<LayoutAdmin />}>
          <Route index element={<Navigate to="supervision" replace />} />
          <Route path="supervision" element={<SupervisionPage />} />
          <Route path="sucursales" element={<SucursalesPage />} />
          <Route path="pantallas" element={<PantallasPage />} />
          <Route path="multimedia" element={<MultimediaPage />} />
          <Route path="listas" element={<ListasPage />} />
          <Route path="historial" element={<HistorialPage />} />
          <Route path="cuenta" element={<CuentaPage />} />

          <Route element={<RutaProtegida roles={SOLO_ADMINISTRADOR} />}>
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="auditoria" element={<AuditoriaPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
