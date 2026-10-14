import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import logoAdPlayClaro from '../assets/logos/adplay-tinta-clara.png'
import logoAdPlayOscuro from '../assets/logos/adplay-tinta-oscura.png'
import logoEdeesteBlanco from '../assets/logos/edeeste-blanco.png'
import logoEdeesteColor from '../assets/logos/edeeste-color.png'
import { useAuth } from '../hooks/useAuth'
import { useTema } from '../hooks/useTema'
import { reportesApi } from '../services/consultasApi'
import { Avatar } from './Avatar'
import { Icono, type NombreIcono } from './Icono'

interface Opcion {
  ruta: string
  texto: string
  icono: NombreIcono
}

const operacion: Opcion[] = [
  { ruta: '/admin/supervision', texto: 'Supervisión', icono: 'pulso' },
  { ruta: '/admin/sucursales', texto: 'Sucursales y grupos', icono: 'edificio' },
  { ruta: '/admin/pantallas', texto: 'Pantallas', icono: 'pantalla' },
  { ruta: '/admin/multimedia', texto: 'Multimedia y anuncios', icono: 'imagen' },
  { ruta: '/admin/listas', texto: 'Listas y publicación', icono: 'lista' },
  { ruta: '/admin/historial', texto: 'Historial', icono: 'historial' },
]

const administracion: Opcion[] = [
  { ruta: '/admin/usuarios', texto: 'Usuarios', icono: 'personas' },
  { ruta: '/admin/auditoria', texto: 'Auditoría', icono: 'escudo' },
]

/** Cada cuánto se refresca el conteo de pantallas en línea de la barra superior. */
const ESTADO_RED_CADA_MS = 30_000

function ItemMenu({ opcion }: { opcion: Opcion }) {
  return (
    <NavLink className="nav-item" to={opcion.ruta}>
      <span className="nav-icono">
        <Icono nombre={opcion.icono} tamano={20} />
      </span>
      <span>{opcion.texto}</span>
    </NavLink>
  )
}

/** «12 de 14 pantallas en línea», o null si todavía no se sabe. */
function useEstadoRed(): string | null {
  const [texto, setTexto] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    const consultar = () =>
      reportesApi.estadoPantallas().then(
        (pantallas) => {
          if (vigente) {
            const enLinea = pantallas.filter((p) => p.estadoOperativo === 'EnLinea').length
            setTexto(`${enLinea} de ${pantallas.length} ${pantallas.length === 1 ? 'pantalla' : 'pantallas'} en línea`)
          }
        },
        () => undefined,
      )
    void consultar()
    const temporizador = window.setInterval(consultar, ESTADO_RED_CADA_MS)
    return () => {
      vigente = false
      window.clearInterval(temporizador)
    }
  }, [])

  return texto
}

export function SelectorTema() {
  const { oscuro, fijarTema } = useTema()
  return (
    <div className="selector-tema" role="group" aria-label="Tema de la interfaz">
      <button className={`opcion-tema${oscuro ? '' : ' activa'}`} type="button" onClick={() => fijarTema('claro')} aria-pressed={!oscuro}>
        <Icono nombre="sol" tamano={16} />
        <span className="texto-opcion">Claro</span>
      </button>
      <button className={`opcion-tema${oscuro ? ' activa' : ''}`} type="button" onClick={() => fijarTema('oscuro')} aria-pressed={oscuro}>
        <Icono nombre="luna" tamano={16} />
        <span className="texto-opcion">Oscuro</span>
      </button>
    </div>
  )
}

export function LayoutAdmin() {
  const { sesion, esAdministrador, cerrarSesion } = useAuth()
  const estadoRed = useEstadoRed()

  return (
    <div className="marco">
      <header className="barra-superior">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img className="solo-claro" src={logoEdeesteColor} alt="EDEEste" style={{ display: 'block', height: 32, width: 'auto' }} />
          <img className="solo-oscuro" src={logoEdeesteBlanco} alt="EDEEste" style={{ height: 32, width: 'auto' }} />
          <span className="solo-ancho" aria-hidden="true" style={{ width: 1, height: 36, background: 'var(--borde)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img className="solo-claro" src={logoAdPlayOscuro} alt="" style={{ display: 'block', width: 44, height: 44 }} />
            <img className="solo-oscuro" src={logoAdPlayClaro} alt="" style={{ width: 44, height: 44 }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="titulo-serif" style={{ fontSize: 21, lineHeight: '24px', fontWeight: 700 }}>
                AdPlay Studio
              </span>
              <span className="etiqueta" style={{ fontSize: 10, lineHeight: '14px' }}>
                EDEEste · Señalización digital
              </span>
            </div>
          </div>
        </div>

        {estadoRed && (
          <NavLink to="/admin/supervision" className="chip chip-acento solo-ancho" style={{ height: 36, padding: '0 16px', gap: 10, fontSize: 12, textDecoration: 'none' }}>
            <span className="punto punto-acento" aria-hidden="true">
              <span className="punto-onda" />
              <span className="punto-centro" style={{ background: 'var(--acento)' }} />
            </span>
            <span>{estadoRed}</span>
          </NavLink>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SelectorTema />
          <NavLink className="avatar" to="/admin/cuenta" title={`Mi cuenta · ${sesion?.nombreCompleto ?? ''}`} aria-label="Mi cuenta">
            <Avatar usuarioId={sesion?.id} nombre={sesion?.nombreCompleto} fotoVersion={sesion?.fotoVersion} className="" style={{ display: 'contents' }} />
          </NavLink>
        </div>
      </header>

      <div className="marco-cuerpo">
        <nav className="lateral" aria-label="Administración">
          <span className="etiqueta" style={{ padding: '6px 12px' }}>
            Operación
          </span>
          {operacion.map((o) => (
            <ItemMenu key={o.ruta} opcion={o} />
          ))}

          {esAdministrador && (
            <>
              <span className="etiqueta" style={{ padding: '18px 12px 6px' }}>
                Administración
              </span>
              {administracion.map((o) => (
                <ItemMenu key={o.ruta} opcion={o} />
              ))}
            </>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <div className="tarjeta" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="etiqueta">Sesión</span>
                <span className="chip" style={{ height: 22 }}>
                  {sesion?.rol}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span className="punto-centro" aria-hidden="true" style={{ background: 'var(--vivo-punto)' }} />
                <strong style={{ fontSize: 13, color: 'var(--titulo)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sesion?.nombreCompleto}
                </strong>
              </div>
              <button
                type="button"
                className="enlace-texto"
                onClick={cerrarSesion}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, alignSelf: 'flex-start', padding: 0 }}
              >
                <Icono nombre="salir" tamano={16} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </nav>

        <main className="contenido">
          <div className="contenido-interior">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
