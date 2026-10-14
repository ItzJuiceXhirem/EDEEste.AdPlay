import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import logoAdPlayClaro from '../assets/logos/adplay-tinta-clara.png'
import logoAdPlayOscuro from '../assets/logos/adplay-tinta-oscura.png'
import { FortalezaClave } from '../components/FortalezaClave'
import { Icono } from '../components/Icono'
import { LONGITUDES } from '../constants/limites'
import { useAuth } from '../hooks/useAuth'
import { useDatos } from '../hooks/useDatos'
import { ErrorApi } from '../services/clienteApi'
import { sesionApi } from '../services/sesionApi'
import type { InvitacionPublica } from '../types/api'
import { requisitosClave } from '../utils/clave'
import { MarcoAcceso } from './MarcoAcceso'

const CLAVE_TOKEN = 'adplay-invitacion'

/**
 * Lee el token de ?token= y lo quita de la barra de direcciones para que no quede en el historial. Se guarda en la
 * pestaña para que recargar la página siga funcionando.
 */
function resolverToken(): string | null {
  const parametros = new URLSearchParams(window.location.search)
  const delEnlace = parametros.get('token')
  try {
    if (delEnlace) {
      window.sessionStorage.setItem(CLAVE_TOKEN, delEnlace)
    }
  } catch {
    // Sin almacenamiento de la pestaña: el token solo vive en esta carga de la página.
  }
  if (delEnlace) {
    parametros.delete('token')
    const consulta = parametros.toString()
    window.history.replaceState(window.history.state, '', window.location.pathname + (consulta ? `?${consulta}` : ''))
    return delEnlace
  }
  try {
    return window.sessionStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

function olvidarToken() {
  try {
    window.sessionStorage.removeItem(CLAVE_TOKEN)
  } catch {
    // Nada que limpiar.
  }
}

/** Activación de una cuenta creada por invitación: la persona confirma su nombre y elige su contraseña. */
export function ActivarCuentaPage() {
  const [token] = useState(resolverToken)
  const invitacion = useDatos(() => (token ? sesionApi.consultarInvitacion(token) : Promise.reject(new ErrorApi(404))), [token])
  const noValida = !invitacion.datos && invitacion.error !== null
  const invitador = invitacion.datos?.invitador ?? 'Un administrador'

  return (
    <MarcoAcceso
      registro
      pildoraDerecha={
        <div className="pildora" style={{ gap: 8 }}>
          <Icono nombre="sobre" tamano={16} style={{ color: 'var(--primario)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}>
            {invitacion.datos ? `Invitación de ${invitador}` : 'Invitación'}
          </span>
        </div>
      }
    >
      <div className="vidrio" style={{ maxWidth: 480, minHeight: 'min(790px, calc(100vh - 190px))', padding: '28px 36px 84px' }}>
        {invitacion.cargando && !invitacion.datos && (
          <p className="suave" role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14 }}>
            <Icono nombre="cargando" className="girar" grosor={2.4} style={{ color: 'var(--primario)' }} />
            Revisando la invitación…
          </p>
        )}
        {!invitacion.cargando && noValida && <InvitacionNoValida error={invitacion.error} esConexion={esErrorDeConexion(invitacion.error)} />}
        {invitacion.datos && token && <Formulario key={token} token={token} invitacion={invitacion.datos} />}
      </div>
    </MarcoAcceso>
  )
}

function esErrorDeConexion(error: string | null): boolean {
  return !!error && error.startsWith('No se pudo conectar')
}

function InvitacionNoValida({ error, esConexion }: { error: string | null; esConexion: boolean }) {
  return (
    <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 0 8px' }}>
      <div
        className="circulo-exito"
        style={{ background: 'var(--aviso-fondo)', border: '1px solid var(--aviso-borde)', color: 'var(--titulo)', boxShadow: 'none' }}
      >
        <Icono nombre={esConexion ? 'alerta' : 'reloj'} tamano={34} />
      </div>
      <h1 className="paso paso-1 titulo-serif" style={{ margin: '0 0 8px', fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>
        {esConexion ? 'No se pudo revisar la invitación' : 'Esta invitación ya no es válida'}
      </h1>
      <p className="paso paso-2" style={{ margin: '0 0 26px', maxWidth: 340, fontSize: 14, lineHeight: '21px', color: 'var(--texto)' }}>
        {esConexion
          ? error
          : 'Venció o ya se usó para activar una cuenta. Pídale a un administrador que le envíe una invitación nueva.'}
      </p>
      {esConexion ? (
        <button className="boton-acceso paso paso-3" type="button" onClick={() => window.location.reload()}>
          <Icono nombre="actualizar" grosor={2.2} />
          <span>Intentar de nuevo</span>
        </button>
      ) : (
        <Link className="boton-acceso paso paso-3" to="/iniciar-sesion">
          <span>Ir a iniciar sesión</span>
          <Icono nombre="flechaDerecha" className="flecha" grosor={2.2} />
        </Link>
      )}
    </div>
  )
}

function Formulario({ token, invitacion }: { token: string; invitacion: InvitacionPublica }) {
  const { sesion, activarCuenta } = useAuth()
  const navegar = useNavigate()
  const [nombre, setNombre] = useState(invitacion.nombreCompleto)
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [estado, setEstado] = useState<'reposo' | 'creando' | 'creada'>('reposo')
  const [error, setError] = useState('')
  // La sesión que había antes de activar (por ejemplo, un administrador probando el enlace en su navegador).
  const [sesionPrevia] = useState(() => sesion?.nombreCompleto ?? null)

  const rol = invitacion.rol.toLowerCase()
  const cumplidos = requisitosClave(clave).filter((r) => r.cumple).length
  const coincide = confirmacion !== '' && clave === confirmacion
  const noCoincide = confirmacion !== '' && clave !== confirmacion
  const completo = nombre.trim() !== '' && cumplidos === 4 && coincide
  const creando = estado === 'creando'
  const textoOjo = verClave ? 'Ocultar contraseñas' : 'Mostrar contraseñas'
  const vence = new Date(invitacion.venceUtc).toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!completo || creando) {
      return
    }
    setEstado('creando')
    setError('')
    try {
      await activarCuenta(token, nombre.trim(), clave)
      olvidarToken()
      setEstado('creada')
    } catch (ex) {
      setEstado('reposo')
      setError(ex instanceof Error ? ex.message : 'No se pudo activar la cuenta.')
    }
  }

  if (estado === 'creada') {
    return (
      <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 0 8px' }}>
        <div className="circulo-exito">
          <Icono nombre="marca" tamano={36} grosor={2.6} className="trazo" />
        </div>
        <h1 className="paso paso-1 titulo-serif" style={{ margin: '0 0 8px', fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>
          Bienvenid@, {nombre.trim().split(/\s+/)[0]}
        </h1>
        <p className="paso paso-2" style={{ margin: '0 0 26px', maxWidth: 330, fontSize: 14, lineHeight: '21px', color: 'var(--texto)' }}>
          Su cuenta de {rol} está lista y la sesión ya está iniciada. Desde Mi cuenta puede agregar su foto de perfil o cambiar su contraseña.
        </p>
        <button className="boton-acceso paso paso-3" type="button" onClick={() => navegar('/admin', { replace: true })} autoFocus>
          <span>Entrar al panel</span>
          <Icono nombre="flechaDerecha" className="flecha" grosor={2.2} />
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div className="logo paso paso-1" style={{ flex: 'none' }}>
          <img className="solo-claro" src={logoAdPlayOscuro} alt="AdPlay" style={{ display: 'block', width: 76, height: 76 }} />
          <img className="solo-oscuro" src={logoAdPlayClaro} alt="AdPlay" style={{ width: 76, height: 76 }} />
        </div>
        <div className="paso paso-2">
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 300, color: 'var(--pizarra)' }}>Invitación a AdPlay</p>
          <h1 className="titulo-serif" style={{ fontSize: 28, lineHeight: '34px', fontWeight: 700, letterSpacing: '-.01em' }}>
            Active su cuenta
          </h1>
        </div>
      </div>

      <div
        className="paso paso-3"
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          padding: '12px 14px',
          marginBottom: 20,
          borderRadius: 12,
          background: 'var(--aviso-fondo)',
          border: '1px solid var(--aviso-borde)',
          fontSize: 13,
          lineHeight: '19px',
          color: 'var(--texto)',
        }}
      >
        <span style={{ flex: 'none', width: 8, height: 8, marginTop: 6, borderRadius: 9999, background: '#FFD100' }} />
        <span>
          <strong style={{ color: 'var(--titulo)' }}>{invitacion.invitador ?? 'Un administrador'}</strong> le invitó a AdPlay como{' '}
          <strong style={{ color: 'var(--titulo)' }}>{rol}</strong>. Confirme su nombre y elija una contraseña. La invitación vence el {vence}.
          {sesionPrevia && ` Hay una sesión iniciada como ${sesionPrevia}; al activar, cambiará a la cuenta nueva.`}
        </span>
      </div>

      <form onSubmit={enviar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div
            className="aparecer"
            role="alert"
            style={{ display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'var(--peligro-fondo)', color: 'var(--peligro)', fontSize: 13, lineHeight: '18px' }}
          >
            <Icono nombre="alerta" />
            <span>{error}</span>
          </div>
        )}

        <div className="paso paso-4" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label className="etiqueta" htmlFor="nombre">
            Nombre completo
          </label>
          <div className="campo-caja">
            <span className="campo-icono" aria-hidden="true">
              <Icono nombre="persona" />
            </span>
            <input
              className="campo-input"
              id="nombre"
              type="text"
              autoComplete="name"
              maxLength={LONGITUDES.nombreCompleto}
              placeholder="Nombre y apellido"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
        </div>

        <div className="paso paso-5" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label className="etiqueta" htmlFor="correo">
            Correo institucional
          </label>
          <div className="campo-caja">
            <span className="campo-icono" aria-hidden="true">
              <Icono nombre="arroba" />
            </span>
            <input className="campo-input" id="correo" type="email" autoComplete="username" value={invitacion.correo} readOnly aria-describedby="ayuda-correo" />
            <span className="candado-campo" aria-hidden="true">
              <Icono nombre="candado" tamano={16} />
            </span>
          </div>
          <span id="ayuda-correo" style={{ fontSize: 12, color: 'var(--pizarra)' }}>
            Es el correo con el que le invitaron; con él iniciará sesión.
          </span>
        </div>

        <div className="dos-columnas paso paso-6" style={{ gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label className="etiqueta" htmlFor="clave">
              Contraseña
            </label>
            <div className="campo-caja">
              <span className="campo-icono" aria-hidden="true">
                <Icono nombre="candado" />
              </span>
              <input
                className="campo-input"
                id="clave"
                type={verClave ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                placeholder="••••••••••"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
              <button className="boton-ojo" type="button" onClick={() => setVerClave(!verClave)} aria-label={textoOjo} title={textoOjo}>
                <Icono nombre={verClave ? 'ojoTachado' : 'ojo'} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label className="etiqueta" htmlFor="confirmacion">
              Repita la contraseña
            </label>
            <div className="campo-caja">
              <span className="campo-icono" aria-hidden="true">
                <Icono nombre="candado" />
              </span>
              <input
                className={`campo-input${noCoincide ? ' invalido' : ''}`}
                id="confirmacion"
                type={verClave ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••••"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                aria-describedby="error-confirmacion"
                aria-invalid={noCoincide}
              />
              {coincide && (
                <span className="marca-campo aparecer" aria-hidden="true">
                  <Icono nombre="marca" className="trazo" grosor={2.6} />
                </span>
              )}
            </div>
          </div>
        </div>
        {noCoincide && (
          <span id="error-confirmacion" className="aparecer" style={{ marginTop: -8, fontSize: 12, color: 'var(--peligro)' }}>
            Las contraseñas no coinciden.
          </span>
        )}

        <div className="paso paso-7">
          <FortalezaClave clave={clave} />
        </div>

        <div className="paso paso-8" style={{ paddingTop: 4 }}>
          <button className={`boton-acceso${creando ? ' ocupado' : ''}`} type="submit" disabled={!completo || creando}>
            {creando ? (
              <>
                <Icono nombre="cargando" className="girar" grosor={2.4} />
                <span>Activando cuenta…</span>
              </>
            ) : (
              <>
                <span>Activar mi cuenta</span>
                <Icono nombre="flechaDerecha" className="flecha" grosor={2.2} />
              </>
            )}
          </button>
        </div>
      </form>

      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--separador)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--pizarra)',
        }}
      >
        <span>¿Ya activó su cuenta?</span>
        <Link to="/iniciar-sesion" style={{ fontWeight: 700, textUnderlineOffset: 2 }}>
          Iniciar sesión
        </Link>
      </div>
    </>
  )
}
