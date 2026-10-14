import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './services/almacenTema'
import App from './App.tsx'
import { ProveedorAuth } from './context/ProveedorAuth'
import { ProveedorAvisos } from './context/ProveedorAvisos'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorAuth>
        <ProveedorAvisos>
          <App />
        </ProveedorAvisos>
      </ProveedorAuth>
    </BrowserRouter>
  </StrictMode>,
)
