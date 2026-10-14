import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { Avatar } from '../../components/Avatar'
import { FortalezaClave } from '../../components/FortalezaClave'
import { Icono } from '../../components/Icono'
import { Migas } from '../../components/Comunes'
import { Dialogo, EncabezadoVentana } from '../../components/Ventanas'
import { TAMANO_MAXIMO_MB } from '../../constants/limites'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useTema } from '../../hooks/useTema'
import { sesionApi } from '../../services/sesionApi'
import type { Rol } from '../../types/api'
import { requisitosClave } from '../../utils/clave'
import './cuenta.css'

/** Tamaño del visor de encuadre (px) y de la foto que se guarda. */
const VISOR = 240
const TAMANO_FOTO = 256
/** La imagen de origen puede pesar más que el límite de la API: lo que se sube es el recorte, que es pequeño. */
const LIMITE_ORIGEN_BYTES = 10 * 1024 * 1024
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']

const DESCRIPCION_ROL: Record<Rol, string> = {
  Administrador: 'Asigna y publica listas, retira versiones, gestiona sucursales, pantallas y usuarios, y consulta la auditoría.',
  Operador: 'Sube multimedia, crea anuncios, arma listas y exporta paquetes. No publica ni asigna.',
}

interface Recorte {
  url: string
  w: number
  h: number
  zoom: number
  x: number
  y: number
}

function escala(r: Recorte) {
  return (VISOR / Math.min(r.w, r.h)) * r.zoom
}

/** Evita que quede espacio vacío dentro del círculo. */
function limitar(r: Recorte): Recorte {
  const s = escala(r)
  return { ...r, x: Math.min(0, Math.max(VISOR - r.w * s, r.x)), y: Math.min(0, Math.max(VISOR - r.h * s, r.y)) }
}

/** Cambia el acercamiento sin mover el punto que está en el centro del visor. */
function conZoom(r: Recorte, zoom: number): Recorte {
  const s = escala(r)
  const cx = (VISOR / 2 - r.x) / s
  const cy = (VISOR / 2 - r.y) / s
  const nuevo = { ...r, zoom: Math.min(3, Math.max(1, zoom)) }
  const s2 = escala(nuevo)
  return limitar({ ...nuevo, x: VISOR / 2 - cx * s2, y: VISOR / 2 - cy * s2 })
}

export function CuentaPage() {
  const { sesion, cerrarSesion, refrescarSesion } = useAuth()
  const avisar = useAvisos()
  const { oscuro, fijarTema } = useTema()
  const entradaFoto = useRef<HTMLInputElement>(null)
  const [recorte, setRecorte] = useState<{ datos: Recorte; imagen: HTMLImageElement } | null>(null)
  const [quitando, setQuitando] = useState(false)

  if (!sesion) {
    return null
  }

  const elegirFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) {
      return
    }
    if (!TIPOS_FOTO.includes(archivo.type)) {
      return avisar('Use una imagen JPG, PNG o WEBP.', { error: true })
    }
    if (archivo.size > LIMITE_ORIGEN_BYTES) {
      return avisar('La imagen no puede pasar de 10 MB.', { error: true })
    }
    const url = URL.createObjectURL(archivo)
    const imagen = new Image()
    imagen.onload = () => {
      setRecorte((anterior) => {
        if (anterior) {
          URL.revokeObjectURL(anterior.datos.url)
        }
        const base: Recorte = { url, w: imagen.naturalWidth, h: imagen.naturalHeight, zoom: 1, x: 0, y: 0 }
        const s = escala(base)
        return { imagen, datos: { ...base, x: (VISOR - base.w * s) / 2, y: (VISOR - base.h * s) / 2 } }
      })
    }
    imagen.onerror = () => {
      URL.revokeObjectURL(url)
      avisar('No se pudo leer la imagen.', { error: true })
    }
    imagen.src = url
  }

  const cerrarRecorte = () => {
    if (recorte) {
      URL.revokeObjectURL(recorte.datos.url)
    }
    setRecorte(null)
  }

  const quitarFoto = async () => {
    setQuitando(true)
    try {
      await sesionApi.quitarFoto()
      await refrescarSesion()
      avisar('Se quitó la foto; se mostrarán sus iniciales.')
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo quitar la foto.', { error: true })
    } finally {
      setQuitando(false)
    }
  }

  const textoFoto = sesion.fotoVersion ? 'Cambiar foto' : 'Agregar foto'

  return (
    <>
      <Migas pagina="Mi cuenta" />
      <header className="entrada">
        <h1 className="titulo-serif" style={{ fontSize: 44, lineHeight: '52px', fontWeight: 700, letterSpacing: '-.02em' }}>
          Mi cuenta
        </h1>
      </header>

      <input
        ref={entradaFoto}
        id="entrada-foto"
        className="oculto"
        type="file"
        accept={TIPOS_FOTO.join(',')}
        onChange={elegirFoto}
        aria-label="Elegir foto de perfil"
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <section className="tarjeta entrada" aria-label="Perfil" style={{ flex: '1 1 320px', minWidth: 0, overflow: 'hidden', animationDelay: '.06s' }}>
          <div className="portada" aria-hidden="true" />
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
            <div className="contenedor-avatar">
              <Avatar usuarioId={sesion.id} nombre={sesion.nombreCompleto} fotoVersion={sesion.fotoVersion} className="avatar-grande" />
              <label className="boton-camara" htmlFor="entrada-foto" title={textoFoto}>
                <Icono nombre="camara" tamano={16} grosor={2.2} />
                <span className="oculto">{textoFoto}</span>
              </label>
            </div>
            <h2 className="titulo-serif" style={{ margin: '12px 0 0', fontSize: 26, lineHeight: '34px', fontWeight: 700 }}>
              {sesion.nombreCompleto}
            </h2>
            <span style={{ fontSize: 14, color: 'var(--pizarra)' }}>{sesion.correo}</span>
            <span className="chip chip-coral" style={{ marginTop: 6 }}>
              {sesion.rol}
            </span>
            <span style={{ display: 'flex', gap: 14, marginTop: 4 }}>
              <button className="enlace-texto" type="button" onClick={() => entradaFoto.current?.click()}>
                {textoFoto}
              </button>
              {sesion.fotoVersion && (
                <button className="enlace-texto" type="button" onClick={() => void quitarFoto()} disabled={quitando}>
                  Quitar foto
                </button>
              )}
            </span>
          </div>
          <div style={{ padding: '0 24px 8px' }}>
            <div className="fila-dato">
              <span className="suave" style={{ fontSize: 14 }}>
                Miembro desde
              </span>
              <strong style={{ color: 'var(--titulo)' }}>{new Date(sesion.fechaCreacionUtc).toLocaleDateString('es-DO', { dateStyle: 'long' })}</strong>
            </div>
            <div className="fila-dato" style={{ flexDirection: 'column', gap: 4 }}>
              <span className="suave" style={{ fontSize: 14 }}>
                Qué puede hacer
              </span>
              <span style={{ color: 'var(--texto)', lineHeight: '20px' }}>{DESCRIPCION_ROL[sesion.rol]}</span>
            </div>
          </div>
          <p className="suave" style={{ padding: '14px 24px', borderTop: '1px solid var(--hundida)', background: 'var(--sutil)', fontSize: 13, lineHeight: '19px' }}>
            Su nombre, su correo y su rol los cambia un administrador desde Usuarios.
          </p>
          <div style={{ padding: '16px 24px 24px' }}>
            <button className="boton boton-secundario" type="button" onClick={cerrarSesion} style={{ width: '100%' }}>
              <Icono nombre="salir" tamano={17} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </section>

        <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <CambiarClave />

          <section className="tarjeta entrada" aria-labelledby="titulo-apariencia" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animationDelay: '.14s' }}>
            <div>
              <h2 id="titulo-apariencia" className="titulo-serif" style={{ margin: '0 0 4px', fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
                Apariencia
              </h2>
              <span className="suave" style={{ fontSize: 13 }}>
                Se guarda en este navegador. También puede cambiarla desde la barra superior.
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
              <OpcionApariencia oscura={false} activa={!oscuro} alElegir={() => fijarTema('claro')} />
              <OpcionApariencia oscura activa={oscuro} alElegir={() => fijarTema('oscuro')} />
            </div>
          </section>
        </div>
      </div>

      {recorte && (
        <EditorFoto
          recorte={recorte.datos}
          imagen={recorte.imagen}
          alCambiar={(datos) => setRecorte((r) => r && { ...r, datos })}
          alElegirOtra={() => entradaFoto.current?.click()}
          alCerrar={cerrarRecorte}
          alGuardar={async (blob) => {
            await sesionApi.cambiarFoto(blob, 'perfil.jpg')
            await refrescarSesion()
            cerrarRecorte()
            avisar('Foto de perfil actualizada.')
          }}
        />
      )}
    </>
  )
}

function CambiarClave() {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [ver, setVer] = useState(false)
  const [estado, setEstado] = useState<'reposo' | 'cambiando' | 'cambiada'>('reposo')
  const [error, setError] = useState('')
  const [sacudir, setSacudir] = useState(false)

  useEffect(() => {
    if (!sacudir) {
      return
    }
    const espera = window.setTimeout(() => setSacudir(false), 520)
    return () => window.clearTimeout(espera)
  }, [sacudir])

  const cumple = requisitosClave(nueva).every((r) => r.cumple)
  const coincide = confirmacion !== '' && nueva === confirmacion
  const noCoincide = confirmacion !== '' && nueva !== confirmacion
  const valida = actual !== '' && cumple && coincide
  const cambiando = estado === 'cambiando'
  const tipo = ver ? 'text' : 'password'
  const textoVer = ver ? 'Ocultar contraseñas' : 'Mostrar contraseñas'

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valida || cambiando) {
      return
    }
    setEstado('cambiando')
    setError('')
    try {
      await sesionApi.cambiarClave(actual, nueva)
      setEstado('cambiada')
      setActual('')
      setNueva('')
      setConfirmacion('')
      setVer(false)
    } catch (ex) {
      setEstado('reposo')
      setError(ex instanceof Error ? ex.message : 'No se pudo cambiar la contraseña.')
      setSacudir(true)
    }
  }

  return (
    <section className={`tarjeta entrada${sacudir ? ' sacudir' : ''}`} aria-labelledby="titulo-clave" style={{ padding: 24, animationDelay: '.1s' }}>
      {estado !== 'cambiada' ? (
        <form onSubmit={enviar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 id="titulo-clave" className="titulo-serif" style={{ margin: '0 0 4px', fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
              Cambiar contraseña
            </h2>
            <span className="suave" style={{ fontSize: 13 }}>
              Use una contraseña que no use en otros servicios.
            </span>
          </div>
          {error && (
            <div className="aviso-error" role="alert">
              <Icono nombre="alerta" />
              <span>{error}</span>
            </div>
          )}
          <label className="campo">
            <span className="etiqueta">Contraseña actual</span>
            <span className="caja-clave">
              <input
                className="control"
                type={tipo}
                autoComplete="current-password"
                value={actual}
                onChange={(e) => {
                  setActual(e.target.value)
                  setError('')
                }}
              />
              <button className="boton-ojo" type="button" onClick={() => setVer(!ver)} aria-label={textoVer} title={textoVer}>
                <Icono nombre={ver ? 'ojoTachado' : 'ojo'} />
              </button>
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <label className="campo">
              <span className="etiqueta">Nueva contraseña</span>
              <input
                className="control"
                type={tipo}
                autoComplete="new-password"
                value={nueva}
                onChange={(e) => {
                  setNueva(e.target.value)
                  setError('')
                }}
              />
            </label>
            <label className="campo">
              <span className="etiqueta">Repita la nueva</span>
              <span className="caja-clave">
                <input
                  className={`control${noCoincide ? ' invalido' : ''}`}
                  type={tipo}
                  autoComplete="new-password"
                  value={confirmacion}
                  onChange={(e) => {
                    setConfirmacion(e.target.value)
                    setError('')
                  }}
                  aria-invalid={noCoincide || undefined}
                />
                {coincide && (
                  <span className="marca-campo" aria-hidden="true">
                    <Icono nombre="marca" grosor={2.6} className="trazo" />
                  </span>
                )}
              </span>
            </label>
          </div>
          {noCoincide && <span style={{ marginTop: -8, fontSize: 12, color: 'var(--peligro)' }}>Las contraseñas no coinciden.</span>}
          <FortalezaClave clave={nueva} />
          <div className="pie-ventana">
            <button className="boton boton-primario" type="submit" disabled={!valida || cambiando}>
              {cambiando && <Icono nombre="cargando" tamano={17} className="girar" grosor={2.4} />}
              <span>{cambiando ? 'Cambiando…' : 'Cambiar contraseña'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '24px 0' }}>
          <span className="circulo-exito" aria-hidden="true">
            <Icono nombre="marca" tamano={30} grosor={2.6} className="trazo" />
          </span>
          <h2 className="titulo-serif" style={{ fontSize: 24, lineHeight: '32px' }}>
            Contraseña cambiada
          </h2>
          <p style={{ maxWidth: 380, fontSize: 14, lineHeight: '21px', color: 'var(--pizarra)' }}>Use la nueva contraseña la próxima vez que inicie sesión.</p>
          <button className="boton boton-secundario" type="button" onClick={() => setEstado('reposo')}>
            Listo
          </button>
        </div>
      )}
    </section>
  )
}

function OpcionApariencia({ oscura, activa, alElegir }: { oscura: boolean; activa: boolean; alElegir: () => void }) {
  // Miniatura fija de cada tema (no depende del tema actual).
  const c = oscura
    ? { fondo: '#0e131d', borde: '#2c364c', barra: '#171c26', tarjeta: '#1b202a', suave: '#252a35', acento: 'rgba(255,209,0,.25)' }
    : { fondo: '#fff7f4', borde: '#e5cfca', barra: '#fffbf9', tarjeta: '#fffbf9', suave: '#f0dfdc', acento: '#FFCDB2' }
  return (
    <button className={`opcion-apariencia${activa ? ' activa' : ''}`} type="button" onClick={alElegir} aria-pressed={activa}>
      <span className="vista-tema" aria-hidden="true" style={{ background: c.fondo, border: `1px solid ${c.borde}` }}>
        <span className="vt-barra" style={{ background: c.barra, borderBottom: `1px solid ${c.borde}` }}>
          <i style={{ width: '18%', height: '30%', background: '#E5989B' }} />
          <i style={{ width: '30%', height: '22%', background: c.suave }} />
        </span>
        <span className="vt-cuerpo">
          <span className="vt-menu" style={{ background: c.barra, borderRight: `1px solid ${c.borde}` }}>
            <i style={{ height: '10%', background: '#E5989B' }} />
            <i style={{ height: '8%', background: c.suave }} />
            <i style={{ height: '8%', background: c.suave }} />
            <i style={{ height: '8%', background: c.suave }} />
          </span>
          <span className="vt-contenido">
            <b style={{ background: c.tarjeta, border: `1px solid ${c.borde}` }} />
            <b style={{ background: c.tarjeta, border: `1px solid ${c.borde}` }} />
            <b style={{ background: c.tarjeta, border: `1px solid ${c.borde}` }} />
            <b style={{ background: c.acento }} />
          </span>
        </span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--titulo)' }}>
        <Icono nombre={oscura ? 'luna' : 'sol'} tamano={16} style={{ color: 'var(--coral)' }} />
        {oscura ? 'Oscuro' : 'Claro'}
      </span>
      {activa && (
        <span className="marca-activa" aria-hidden="true">
          <Icono nombre="marca" tamano={14} grosor={3} />
        </span>
      )}
    </button>
  )
}

function EditorFoto({
  recorte: r,
  imagen,
  alCambiar,
  alElegirOtra,
  alCerrar,
  alGuardar,
}: {
  recorte: Recorte
  imagen: HTMLImageElement
  alCambiar: (r: Recorte) => void
  alElegirOtra: () => void
  alCerrar: () => void
  alGuardar: (foto: Blob) => Promise<void>
}) {
  const id = useId()
  const arrastre = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const s = escala(r)

  const vista = (tamano: number) => {
    const f = tamano / VISOR
    return { width: r.w * s * f, height: r.h * s * f, transform: `translate(${r.x * f}px, ${r.y * f}px)` }
  }

  const alPresionar = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    arrastre.current = { px: e.clientX, py: e.clientY, x: r.x, y: r.y }
  }

  const alMover = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current
    if (a) {
      alCambiar(limitar({ ...r, x: a.x + e.clientX - a.px, y: a.y + e.clientY - a.py }))
    }
  }

  const alTecla = (e: KeyboardEvent<HTMLDivElement>) => {
    const pasos: Record<string, [number, number]> = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }
    const paso = pasos[e.key]
    if (paso) {
      e.preventDefault()
      alCambiar(limitar({ ...r, x: r.x + paso[0], y: r.y + paso[1] }))
    } else if (e.key === '+' || e.key === '=') {
      alCambiar(conZoom(r, r.zoom + 0.1))
    } else if (e.key === '-') {
      alCambiar(conZoom(r, r.zoom - 0.1))
    }
  }

  const guardar = async () => {
    const lienzo = document.createElement('canvas')
    lienzo.width = TAMANO_FOTO
    lienzo.height = TAMANO_FOTO
    const contexto = lienzo.getContext('2d')
    if (!contexto) {
      return setError('El navegador no pudo preparar la imagen.')
    }
    contexto.imageSmoothingQuality = 'high'
    contexto.drawImage(imagen, -r.x / s, -r.y / s, VISOR / s, VISOR / s, 0, 0, TAMANO_FOTO, TAMANO_FOTO)
    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', 0.88))
    if (!blob) {
      return setError('El navegador no pudo preparar la imagen.')
    }
    if (blob.size > TAMANO_MAXIMO_MB.FotoPerfil * 1024 * 1024) {
      return setError(`La foto no puede pasar de ${TAMANO_MAXIMO_MB.FotoPerfil} MB.`)
    }
    setGuardando(true)
    setError('')
    try {
      await alGuardar(blob)
    } catch (e) {
      setGuardando(false)
      setError(e instanceof Error ? e.message : 'No se pudo guardar la foto.')
    }
  }

  return (
    <Dialogo titulo="Ajustar foto" idTitulo={id} alCerrar={alCerrar} bloqueada={guardando} style={{ width: 'min(560px, calc(100vw - 32px))', gap: 0 }}>
      <EncabezadoVentana
        id={id}
        antetitulo="Foto de perfil"
        titulo="Ajustar foto"
        descripcion="Arrastre la imagen para encuadrarla y use el control para acercarla."
        alCerrar={guardando ? undefined : alCerrar}
      />
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', margin: '20px 0 16px' }}>
        <div
          className="recorte"
          tabIndex={0}
          role="group"
          aria-label="Encuadre de la foto. Arrastre o use las flechas para moverla."
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={() => (arrastre.current = null)}
          onPointerCancel={() => (arrastre.current = null)}
          onKeyDown={alTecla}
        >
          <img src={r.url} alt="" draggable={false} style={vista(VISOR)} />
          <span className="mascara" aria-hidden="true" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flex: '1 1 140px' }}>
          <span className="etiqueta">Vista previa</span>
          <span className="vista-previa" style={{ width: 96, height: 96 }}>
            <img src={r.url} alt="" style={vista(96)} />
          </span>
          <span className="vista-previa" style={{ width: 44, height: 44 }}>
            <img src={r.url} alt="" style={vista(44)} />
          </span>
          <span className="suave">Así se verá en el panel</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="boton-zoom" type="button" onClick={() => alCambiar(conZoom(r, r.zoom - 0.2))} aria-label="Alejar">
          <Icono nombre="menos" tamano={16} grosor={2.2} />
        </button>
        <input
          className="deslizador"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={r.zoom}
          onChange={(e) => alCambiar(conZoom(r, Number(e.target.value)))}
          aria-label="Acercar o alejar"
        />
        <button className="boton-zoom" type="button" onClick={() => alCambiar(conZoom(r, r.zoom + 0.2))} aria-label="Acercar">
          <Icono nombre="mas" tamano={16} grosor={2.2} />
        </button>
      </div>
      {error && (
        <div className="aviso-error" role="alert" style={{ marginTop: 16 }}>
          <Icono nombre="alerta" />
          <span>{error}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        <button className="enlace-texto" type="button" onClick={alElegirOtra} disabled={guardando}>
          Elegir otra imagen
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="boton boton-secundario" type="button" onClick={alCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="boton boton-primario" type="button" onClick={() => void guardar()} disabled={guardando}>
            {guardando && <Icono nombre="cargando" className="girar" grosor={2.4} />}
            Guardar foto
          </button>
        </div>
      </div>
    </Dialogo>
  )
}
