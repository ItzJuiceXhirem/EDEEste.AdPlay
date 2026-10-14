import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import logoAdPlayClaro from '../assets/logos/adplay-tinta-clara.png'
import logoAdPlayOscuro from '../assets/logos/adplay-tinta-oscura.png'
import { Icono } from '../components/Icono'
import { useAuth } from '../hooks/useAuth'
import { useDatos } from '../hooks/useDatos'
import { sesionApi } from '../services/sesionApi'
import { esCorreoValido } from '../utils/clave'
import { MarcoAcceso } from './MarcoAcceso'

function useHora() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 15_000)
    return () => window.clearInterval(reloj)
  }, [])
  return ahora.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' })
}

export function IniciarSesionPage() {
  const { sesion, cargando, iniciarSesion } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  // También sirve de comprobación de que el servidor responde.
  const registro = useDatos(() => sesionApi.registroInicialDisponible())
  const hora = useHora()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [ayuda, setAyuda] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState('')
  const [sacudir, setSacudir] = useState(false)

  useEffect(() => {
    if (!sacudir) {
      return
    }
    const espera = window.setTimeout(() => setSacudir(false), 520)
    return () => window.clearTimeout(espera)
  }, [sacudir])

  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/admin'
  if (sesion && !cargando) {
    return <Navigate to={destino} replace />
  }

  const fallar = (mensaje: string) => {
    setError(mensaje)
    setSacudir(true)
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (verificando) {
      return
    }
    const correoLimpio = correo.trim()
    if (!correoLimpio || !clave) {
      return fallar('Escriba su correo y su contraseña.')
    }
    if (!esCorreoValido(correoLimpio)) {
      return fallar('El correo no tiene un formato válido.')
    }
    setVerificando(true)
    setError('')
    try {
      await iniciarSesion(correoLimpio, clave)
      navegar(destino, { replace: true })
    } catch (ex) {
      setVerificando(false)
      fallar(ex instanceof Error ? ex.message : 'No se pudo iniciar sesión.')
    }
  }

  const servidorDisponible = !registro.error
  const textoOjo = verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'

  return (
    <MarcoAcceso
      pildoraDerecha={
        <div className="pildora" role="status">
          <span className="punto" aria-hidden="true">
            <span className="punto-onda" style={{ background: servidorDisponible ? 'var(--primario)' : 'var(--peligro)', opacity: 0.7 }} />
            <span className="punto-centro" style={{ background: servidorDisponible ? 'var(--primario)' : 'var(--peligro)' }} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}>
            {registro.cargando ? 'Conectando…' : servidorDisponible ? 'Servidor disponible' : 'Servidor sin conexión'}
          </span>
          <span className="solo-ancho" style={{ color: 'var(--pizarra)', opacity: 0.6 }}>
            •
          </span>
          <span className="solo-ancho" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--primario)' }}>
            <Icono nombre="reloj" tamano={15} />
            {hora}
          </span>
        </div>
      }
    >
      <div className={`vidrio${sacudir ? ' sacudir' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 26 }}>
          <div className="logo flotar" style={{ marginBottom: 12 }}>
            <img className="solo-claro" src={logoAdPlayOscuro} alt="AdPlay" style={{ display: 'block', width: 124, height: 124 }} />
            <img className="solo-oscuro" src={logoAdPlayClaro} alt="AdPlay" style={{ width: 124, height: 124 }} />
          </div>
          <p className="paso paso-2" style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 300, color: 'var(--pizarra)' }}>
            Acceso a la red de transmisión digital
          </p>
          <h1 className="paso paso-2 titulo-serif" style={{ fontSize: 30, lineHeight: '36px', fontWeight: 700, letterSpacing: '-.01em' }}>
            Iniciar sesión
          </h1>
        </div>

        <form onSubmit={enviar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div
              className="aparecer"
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '11px 14px',
                borderRadius: 12,
                background: 'var(--peligro-fondo)',
                color: 'var(--peligro)',
                fontSize: 13,
                lineHeight: '18px',
              }}
            >
              <Icono nombre="alerta" />
              <span>{error}</span>
            </div>
          )}

          <div className="paso paso-3" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label className="etiqueta" htmlFor="correo">
              Correo institucional
            </label>
            <div className="campo-caja">
              <span className="campo-icono" aria-hidden="true">
                <Icono nombre="arroba" />
              </span>
              <input
                className="campo-input"
                id="correo"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="nombre@edeeste.com.do"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value)
                  setError('')
                }}
              />
            </div>
          </div>

          <div className="paso paso-4" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <label className="etiqueta" htmlFor="clave">
                Contraseña
              </label>
              <button className="enlace-texto" type="button" onClick={() => setAyuda(!ayuda)} aria-expanded={ayuda}>
                ¿Olvidó su contraseña?
              </button>
            </div>
            <div className="campo-caja">
              <span className="campo-icono" aria-hidden="true">
                <Icono nombre="candado" />
              </span>
              <input
                className="campo-input"
                id="clave"
                type={verClave ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={clave}
                onChange={(e) => {
                  setClave(e.target.value)
                  setError('')
                }}
              />
              <button className="boton-ojo" type="button" onClick={() => setVerClave(!verClave)} aria-label={textoOjo} title={textoOjo}>
                <Icono nombre={verClave ? 'ojoTachado' : 'ojo'} />
              </button>
            </div>
            {ayuda && (
              <p
                className="aparecer"
                style={{ margin: '2px 0 0', padding: '10px 12px', borderRadius: 10, background: 'var(--ayuda-fondo)', fontSize: 12, lineHeight: '18px', color: 'var(--texto)' }}
              >
                Por seguridad, las contraseñas solo las restablece un administrador desde <strong>Usuarios</strong>. Pídale que le asigne una nueva.
              </p>
            )}
          </div>

          <div className="paso paso-5" style={{ paddingTop: 6 }}>
            <button className={`boton-acceso${verificando ? ' ocupado' : ''}`} type="submit" disabled={verificando}>
              {verificando ? (
                <>
                  <Icono nombre="cargando" className="girar" grosor={2.4} />
                  <span>Verificando sesión…</span>
                </>
              ) : (
                <>
                  <span>Ingresar a AdPlay</span>
                  <Icono nombre="flechaDerecha" className="flecha" grosor={2.2} />
                </>
              )}
            </button>
          </div>
        </form>

        {registro.datos && (
          <div
            className="paso paso-6"
            style={{
              marginTop: 22,
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
            <span>¿Primera vez en AdPlay?</span>
            <Link to="/registro" style={{ fontWeight: 700, textUnderlineOffset: 2 }}>
              Crear la primera cuenta
            </Link>
          </div>
        )}
      </div>
    </MarcoAcceso>
  )
}
