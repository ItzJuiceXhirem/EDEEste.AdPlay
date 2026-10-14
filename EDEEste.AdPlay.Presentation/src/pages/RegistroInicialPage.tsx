import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import logoAdPlayClaro from '../assets/logos/adplay-tinta-clara.png'
import logoAdPlayOscuro from '../assets/logos/adplay-tinta-oscura.png'
import { FortalezaClave } from '../components/FortalezaClave'
import { Icono } from '../components/Icono'
import { LONGITUDES } from '../constants/limites'
import { useAuth } from '../hooks/useAuth'
import { useDatos } from '../hooks/useDatos'
import { sesionApi } from '../services/sesionApi'
import { esCorreoValido, requisitosClave } from '../utils/clave'
import { MarcoAcceso } from './MarcoAcceso'

/**
 * Registro de primera vez: crea al administrador cuando el sistema aún no tiene usuarios. En cuanto existe
 * cualquier usuario la API lo rechaza y esta página redirige al inicio de sesión.
 */
export function RegistroInicialPage() {
  const { sesion, registrarAdministradorInicial } = useAuth()
  const navegar = useNavigate()
  const disponible = useDatos(() => sesionApi.registroInicialDisponible())
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [tocoCorreo, setTocoCorreo] = useState(false)
  const [estado, setEstado] = useState<'reposo' | 'creando' | 'creada'>('reposo')
  const [error, setError] = useState('')

  // Tras crear la cuenta ya hay sesión, pero se muestra la bienvenida antes de entrar al panel.
  if (sesion && estado !== 'creada') {
    return <Navigate to="/admin" replace />
  }
  if (disponible.datos === false && estado !== 'creada') {
    return <Navigate to="/iniciar-sesion" replace />
  }

  const cumplidos = requisitosClave(clave).filter((r) => r.cumple).length
  const correoValido = esCorreoValido(correo)
  const correoInvalido = tocoCorreo && correo.trim() !== '' && !correoValido
  const coincide = confirmacion !== '' && clave === confirmacion
  const noCoincide = confirmacion !== '' && clave !== confirmacion
  const completo = nombre.trim() !== '' && correoValido && cumplidos === 4 && coincide
  const creando = estado === 'creando'
  const textoOjo = verClave ? 'Ocultar contraseñas' : 'Mostrar contraseñas'

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!completo || creando) {
      return
    }
    setEstado('creando')
    setError('')
    try {
      await registrarAdministradorInicial(correo.trim(), nombre.trim(), clave)
      setEstado('creada')
    } catch (ex) {
      setEstado('reposo')
      setError(ex instanceof Error ? ex.message : 'No se pudo crear la cuenta.')
    }
  }

  return (
    <MarcoAcceso
      registro
      pildoraDerecha={
        <div className="pildora" style={{ gap: 8 }}>
          <Icono nombre="escudo" tamano={16} style={{ color: 'var(--primario)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}>Configuración inicial</span>
        </div>
      }
    >
      <div className="vidrio" style={{ maxWidth: 480, minHeight: 'min(790px, calc(100vh - 190px))', padding: '28px 36px 84px' }}>
        {estado !== 'creada' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div className="logo paso paso-1" style={{ flex: 'none' }}>
                <img className="solo-claro" src={logoAdPlayOscuro} alt="AdPlay" style={{ display: 'block', width: 76, height: 76 }} />
                <img className="solo-oscuro" src={logoAdPlayClaro} alt="AdPlay" style={{ width: 76, height: 76 }} />
              </div>
              <div className="paso paso-2">
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 300, color: 'var(--pizarra)' }}>Primera vez en AdPlay</p>
                <h1 className="titulo-serif" style={{ fontSize: 28, lineHeight: '34px', fontWeight: 700, letterSpacing: '-.01em' }}>
                  Crear la primera cuenta
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
                El sistema todavía no tiene usuarios. Esta cuenta será <strong style={{ color: 'var(--titulo)' }}>administrador</strong>. Al
                crearla, el registro se cierra y las demás cuentas se crean desde el panel.
              </span>
            </div>

            <form onSubmit={enviar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(error || disponible.error) && (
                <div
                  className="aparecer"
                  role="alert"
                  style={{ display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'var(--peligro-fondo, rgba(255,218,214,.9))', color: 'var(--peligro)', fontSize: 13, lineHeight: '18px' }}
                >
                  <Icono nombre="alerta" />
                  <span>{error || disponible.error}</span>
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
                    autoFocus
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
                  <input
                    className={`campo-input${correoInvalido ? ' invalido' : ''}`}
                    id="correo"
                    type="email"
                    autoComplete="username"
                    placeholder="nombre@edeeste.com.do"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    onBlur={() => setTocoCorreo(true)}
                    aria-describedby="error-correo"
                    aria-invalid={correoInvalido}
                  />
                </div>
                {correoInvalido && (
                  <span id="error-correo" className="aparecer" style={{ fontSize: 12, color: 'var(--peligro)' }}>
                    Escriba un correo con formato válido.
                  </span>
                )}
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
                      <span>Creando cuenta…</span>
                    </>
                  ) : (
                    <>
                      <span>Crear cuenta de administrador</span>
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
              <span>¿Ya tiene una cuenta?</span>
              <Link to="/iniciar-sesion" style={{ fontWeight: 700, textUnderlineOffset: 2 }}>
                Iniciar sesión
              </Link>
            </div>
          </>
        ) : (
          <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 0 8px' }}>
            <div className="circulo-exito">
              <Icono nombre="marca" tamano={36} grosor={2.6} className="trazo" />
            </div>
            <h1 className="paso paso-1 titulo-serif" style={{ margin: '0 0 8px', fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>
              Bienvenido, {nombre.trim().split(/\s+/)[0]}
            </h1>
            <p className="paso paso-2" style={{ margin: '0 0 26px', maxWidth: 330, fontSize: 14, lineHeight: '21px', color: 'var(--texto)' }}>
              Su cuenta de administrador está lista y la sesión ya está iniciada. El registro de primera vez quedó cerrado.
            </p>
            <button className="boton-acceso paso paso-3" type="button" onClick={() => navegar('/admin', { replace: true })} autoFocus>
              <span>Entrar al panel</span>
              <Icono nombre="flechaDerecha" className="flecha" grosor={2.2} />
            </button>
          </div>
        )}
      </div>
    </MarcoAcceso>
  )
}
