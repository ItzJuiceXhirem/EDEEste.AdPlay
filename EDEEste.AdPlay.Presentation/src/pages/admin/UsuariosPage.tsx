import { useId, useState, type FormEvent } from 'react'
import { Avatar } from '../../components/Avatar'
import { CampoClave } from '../../components/CampoClave'
import { AvisoError, Buscador, CabeceraPagina, Esqueleto, Interruptor, Migas, Pestanas, Segmento } from '../../components/Comunes'
import { DialogoEnlace } from '../../components/DialogoEnlace'
import { Icono } from '../../components/Icono'
import { Cajon, Confirmacion, Dialogo } from '../../components/Ventanas'
import { LONGITUDES } from '../../constants/limites'
import { ROLES } from '../../constants/seguridad'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useDatos } from '../../hooks/useDatos'
import { invitacionesApi, usuariosApi } from '../../services/sesionApi'
import type { Invitacion, Rol, Usuario } from '../../types/api'
import { esCorreoValido, requisitosClave } from '../../utils/clave'
import { coincideBusqueda } from '../../utils/formato'
import './usuarios.css'

const COLORES: [string, string][] = [
  ['#FFB4A2', '#E5989B'],
  ['#E5989B', '#B5838D'],
  ['#FFCDB2', '#E5989B'],
  ['#B5838D', '#6D6875'],
  ['#FFB4A2', '#B5838D'],
  ['#E5989B', '#6D6875'],
]

const DESCRIPCION_ROL: Record<Rol, string> = {
  Administrador: 'Asigna y publica listas, retira versiones, gestiona sucursales, pantallas y usuarios, y consulta la auditoría.',
  Operador: 'Sube multimedia, crea anuncios, arma listas y exporta paquetes. No publica ni asigna.',
}

type Filtro = 'todos' | 'Administrador' | 'Operador' | 'inactivos'

const FILTROS: Record<Filtro, (u: Usuario) => boolean> = {
  todos: () => true,
  Administrador: (u) => u.rol === ROLES.administrador,
  Operador: (u) => u.rol === ROLES.operador,
  inactivos: (u) => !u.estaActivo,
}

/** Cómo entra la persona: con un enlace para elegir su contraseña, o con una que el administrador le comparte. */
type ModoAlta = 'invitacion' | 'clave'

const FORMULARIO_VACIO = { modo: 'invitacion' as ModoAlta, nombre: '', correo: '', rol: ROLES.operador as Rol, clave: '', error: '', ocupado: false }

function fechaCorta(utc: string) {
  return new Date(utc).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
}

const claveValida = (clave: string) => requisitosClave(clave).every((r) => r.cumple)

function mensajeDe(e: unknown, predeterminado: string) {
  return e instanceof Error ? e.message : predeterminado
}

export function UsuariosPage() {
  const { sesion } = useAuth()
  const avisar = useAvisos()
  const usuarios = useDatos(() => usuariosApi.listar())
  const invitaciones = useDatos(() => invitacionesApi.listar())
  const [enlace, setEnlace] = useState<{ nombre: string; url: string; vence: string } | null>(null)
  const [anular, setAnular] = useState<Invitacion | null>(null)
  const [anulando, setAnulando] = useState(false)
  const [reenviando, setReenviando] = useState<number | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [cajon, setCajon] = useState(false)
  const [form, setForm] = useState(FORMULARIO_VACIO)
  const [restablecer, setRestablecer] = useState<Usuario | null>(null)
  const [nuevos, setNuevos] = useState<Record<number, boolean>>({})
  const [ocupados, setOcupados] = useState<Record<number, boolean>>({})

  const lista = [...(usuarios.datos ?? [])].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'))
  const visibles = lista.filter(FILTROS[filtro]).filter((u) => coincideBusqueda(busqueda, u.nombreCompleto, u.correo))
  const adminsActivos = lista.filter((u) => u.rol === ROLES.administrador && u.estaActivo).length

  // Reglas de la API: nadie se desactiva a sí mismo y siempre queda al menos un administrador activo.
  const actualizar = async (u: Usuario, cambios: { rol?: Rol; estaActivo?: boolean }) => {
    const despues = { ...u, ...cambios }
    if (u.id === sesion?.id && u.estaActivo && despues.estaActivo === false) {
      return avisar('No puede desactivar su propia cuenta.', { error: true })
    }
    const quedan = lista.map((x) => (x.id === u.id ? despues : x)).filter((x) => x.rol === ROLES.administrador && x.estaActivo).length
    if (quedan === 0) {
      return avisar('Debe existir al menos un administrador activo.', { error: true })
    }
    setOcupados((o) => ({ ...o, [u.id]: true }))
    try {
      await usuariosApi.actualizar(u.id, { nombreCompleto: u.nombreCompleto, rol: despues.rol, estaActivo: despues.estaActivo })
      await usuarios.recargar()
      avisar(
        cambios.rol
          ? `Ahora ${u.nombreCompleto} es ${cambios.rol.toLowerCase()}. Se aplica cuando renueve su sesión.`
          : `${u.nombreCompleto}${despues.estaActivo ? ' puede volver a iniciar sesión.' : ' ya no puede iniciar sesión.'}`,
      )
    } catch (e) {
      avisar(mensajeDe(e, 'No se pudo guardar el cambio.'), { error: true })
    } finally {
      setOcupados((o) => ({ ...o, [u.id]: false }))
    }
  }

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    const correo = form.correo.trim().toLowerCase()
    const nombre = form.nombre.trim()
    let error = ''
    if (!nombre || !correo) {
      error = 'Escriba el nombre y el correo.'
    } else if (!esCorreoValido(correo)) {
      error = 'El correo no tiene un formato válido.'
    } else if (lista.some((u) => u.correo.toLowerCase() === correo)) {
      error = 'Ya existe un usuario con ese correo.'
    } else if (form.modo === 'clave' && !claveValida(form.clave)) {
      error = 'La contraseña no cumple los requisitos.'
    }
    if (error) {
      return setForm({ ...form, error })
    }
    setForm({ ...form, ocupado: true, error: '' })
    if (form.modo === 'invitacion') {
      try {
        await invitar({ correo, nombreCompleto: nombre, rol: form.rol })
        setCajon(false)
        setForm(FORMULARIO_VACIO)
      } catch (ex) {
        setForm((f) => ({ ...f, ocupado: false, error: mensajeDe(ex, 'No se pudo crear la invitación.') }))
      }
      return
    }
    try {
      const creado = await usuariosApi.crear({ correo, nombreCompleto: nombre, rol: form.rol, clave: form.clave })
      setNuevos((n) => ({ ...n, [creado.id]: true }))
      setCajon(false)
      setForm(FORMULARIO_VACIO)
      setFiltro('todos')
      setBusqueda('')
      await usuarios.recargar()
      avisar(`Cuenta de ${nombre} creada como ${form.rol.toLowerCase()}. Compártale la contraseña por un canal seguro.`)
    } catch (ex) {
      setForm((f) => ({ ...f, ocupado: false, error: mensajeDe(ex, 'No se pudo crear la cuenta.') }))
    }
  }

  /** Crea la invitación (y anula las anteriores al mismo correo) y muestra el enlace para compartirlo. */
  const invitar = async (datos: { correo: string; nombreCompleto: string; rol: Rol }) => {
    const creada = await invitacionesApi.crear(datos)
    await invitaciones.recargar()
    setEnlace({ nombre: datos.nombreCompleto, url: invitacionesApi.enlace(creada.token), vence: creada.invitacion.venceUtc })
    avisar(`Invitación para ${datos.nombreCompleto} creada como ${datos.rol.toLowerCase()}.`)
  }

  const reenviar = async (i: Invitacion) => {
    setReenviando(i.id)
    try {
      await invitar({ correo: i.correo, nombreCompleto: i.nombreCompleto, rol: i.rol })
    } catch (e) {
      avisar(mensajeDe(e, 'No se pudo generar el enlace nuevo.'), { error: true })
    } finally {
      setReenviando(null)
    }
  }

  const confirmarAnular = async () => {
    if (!anular) {
      return
    }
    setAnulando(true)
    try {
      await invitacionesApi.revocar(anular.id)
      await invitaciones.recargar()
      avisar(`Se anuló la invitación de ${anular.nombreCompleto}; su enlace ya no sirve.`)
      setAnular(null)
    } catch (e) {
      avisar(mensajeDe(e, 'No se pudo anular la invitación.'), { error: true })
    } finally {
      setAnulando(false)
    }
  }

  const contar = (f: Filtro) => lista.filter(FILTROS[f]).length
  const abiertas = invitaciones.datos ?? []

  return (
    <>
      <Migas pagina="Usuarios" />
      <CabeceraPagina titulo="Usuarios" descripcion="Invite al equipo o cree sus cuentas, y decida qué puede hacer cada persona.">
        <button
          className="boton boton-primario"
          type="button"
          onClick={() => {
            setForm(FORMULARIO_VACIO)
            setCajon(true)
          }}
        >
          <Icono nombre="mas" grosor={2.2} />
          <span>Nuevo usuario</span>
        </button>
      </CabeceraPagina>

      <AvisoError mensaje={usuarios.error ?? invitaciones.error} />

      <section aria-label="Roles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {[
          { titulo: 'Administradores', cantidad: contar('Administrador'), descripcion: DESCRIPCION_ROL.Administrador },
          { titulo: 'Operadores', cantidad: contar('Operador'), descripcion: DESCRIPCION_ROL.Operador },
          { titulo: 'Cuentas inactivas', cantidad: contar('inactivos'), descripcion: 'No pueden iniciar sesión. Su historial se conserva en la auditoría.' },
        ].map((r, i) => (
          <div key={r.titulo} className="rol-tarjeta" style={{ animationDelay: `${(0.05 + i * 0.05).toFixed(2)}s` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="etiqueta">{r.titulo}</span>
              <span className="dato-numero">{usuarios.datos ? r.cantidad : '—'}</span>
            </div>
            <span style={{ fontSize: 13, lineHeight: '19px', color: 'var(--texto)' }}>{r.descripcion}</span>
          </div>
        ))}
      </section>

      <section className="tarjeta entrada" style={{ overflow: 'hidden', animationDelay: '.12s' }}>
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--hundida)',
          }}
        >
          <Pestanas
            etiqueta="Filtrar usuarios"
            valor={filtro}
            alCambiar={setFiltro}
            pestanas={[
              { valor: 'todos', texto: 'Todos', cuenta: contar('todos') },
              { valor: 'Administrador', texto: 'Administradores', cuenta: contar('Administrador') },
              { valor: 'Operador', texto: 'Operadores', cuenta: contar('Operador') },
              { valor: 'inactivos', texto: 'Inactivos', cuenta: contar('inactivos') },
            ]}
          />
          <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar usuario" marcador="Buscar por nombre o correo" anchoMaximo={320} />
        </div>

        {usuarios.cargando && !usuarios.datos && (
          <div style={{ padding: 24 }}>
            <Esqueleto alto={56} cantidad={4} />
          </div>
        )}

        {visibles.length > 0 && (
          <div className="tabla-caja">
            <table className="tabla" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {visibles.map((u, i) => {
                  const esYo = u.id === sesion?.id
                  const unicoAdmin = u.rol === ROLES.administrador && u.estaActivo && adminsActivos === 1
                  const [colorA, colorB] = COLORES[(u.id - 1 + COLORES.length) % COLORES.length]
                  const ocupado = !!ocupados[u.id]
                  return (
                    <tr
                      key={u.id}
                      className={['fila', u.estaActivo ? '' : 'inactivo', nuevos[u.id] ? 'nuevo' : ''].join(' ')}
                      style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar
                            usuarioId={u.id}
                            nombre={u.nombreCompleto}
                            fotoVersion={u.fotoVersion}
                            className="iniciales iniciales-grande"
                            style={{ background: `linear-gradient(145deg, ${colorA}, ${colorB})` }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong className="titulo-serif" style={{ fontSize: 16, lineHeight: '21px' }}>
                                {u.nombreCompleto}
                              </strong>
                              {esYo && (
                                <span className="chip chip-coral" style={{ height: 20, fontSize: 10 }}>
                                  Usted
                                </span>
                              )}
                            </div>
                            <span className="suave">{u.correo}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Segmento
                          etiqueta={`Rol de ${u.nombreCompleto}`}
                          valor={u.rol}
                          alCambiar={(rol) => rol !== u.rol && void actualizar(u, { rol })}
                          deshabilitado={ocupado}
                          opciones={[
                            { valor: ROLES.operador, texto: 'Operador' },
                            { valor: ROLES.administrador, texto: 'Administrador' },
                          ]}
                        />
                      </td>
                      <td>
                        <span
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}
                          title={esYo && u.estaActivo ? 'No puede desactivar su propia cuenta' : unicoAdmin ? 'Es el único administrador activo' : undefined}
                        >
                          <Interruptor
                            encendido={u.estaActivo}
                            alCambiar={(estaActivo) => void actualizar(u, { estaActivo })}
                            etiqueta={`${u.estaActivo ? 'Desactivar' : 'Activar'} a ${u.nombreCompleto}`}
                            deshabilitado={(esYo && u.estaActivo) || ocupado}
                          />
                          <span>{u.estaActivo ? 'Activo' : 'Inactivo'}</span>
                        </span>
                      </td>
                      <td className="tabular">{new Date(u.fechaCreacionUtc).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="boton boton-secundario boton-mini"
                          type="button"
                          onClick={() => setRestablecer(u)}
                          aria-label={`Restablecer contraseña de ${u.nombreCompleto}`}
                        >
                          <Icono nombre="llave" tamano={15} />
                          <span>Restablecer contraseña</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {usuarios.datos && visibles.length === 0 && (
          <p className="suave" style={{ padding: '40px 24px', textAlign: 'center', fontSize: 14 }}>
            Ningún usuario coincide con la búsqueda.
          </p>
        )}

        <div className="suave" style={{ padding: '14px 24px', borderTop: '1px solid var(--hundida)', fontSize: 13 }}>
          Un cambio de rol se aplica cuando la persona renueva su sesión (en menos de 30 minutos). Siempre debe quedar al menos un administrador activo.
        </div>
      </section>

      {abiertas.length > 0 && (
        <section className="tarjeta entrada" aria-labelledby="titulo-invitaciones" style={{ overflow: 'hidden', animationDelay: '.16s' }}>
          <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h2 id="titulo-invitaciones" className="titulo-serif" style={{ fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
              Invitaciones sin activar
            </h2>
            <span className="suave" style={{ fontSize: 13 }}>
              El enlace sirve una sola vez y vence a los 7 días. Si se perdió o venció, genere uno nuevo: el anterior deja de servir.
            </span>
          </div>
          <div className="tabla-caja">
            <table className="tabla" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Invitó</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {abiertas.map((i, n) => {
                  const vencida = i.estado === 'Vencida'
                  return (
                    <tr key={i.id} className="fila" style={{ animationDelay: `${(n * 0.04).toFixed(2)}s` }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="iniciales iniciales-grande vacio" aria-hidden="true">
                            <Icono nombre="sobre" tamano={18} />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <strong className="titulo-serif" style={{ display: 'block', fontSize: 16, lineHeight: '21px' }}>
                              {i.nombreCompleto}
                            </strong>
                            <span className="suave">{i.correo}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="chip">{i.rol}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className={`chip ${vencida ? 'chip-desactualizada' : 'chip-acento'}`}>{vencida ? 'Vencida' : 'Pendiente'}</span>
                          <span className="suave tabular">
                            {vencida ? 'Venció' : 'Vence'} el {fechaCorta(i.venceUtc)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span>{i.invitador ?? '—'}</span>
                        <span className="suave tabular" style={{ display: 'block' }}>
                          {fechaCorta(i.fechaCreacionUtc)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          <button
                            className="boton boton-secundario boton-mini"
                            type="button"
                            onClick={() => void reenviar(i)}
                            disabled={reenviando === i.id}
                            aria-label={`Generar un enlace nuevo para ${i.nombreCompleto}`}
                          >
                            <Icono nombre={reenviando === i.id ? 'cargando' : 'enlace'} tamano={15} className={reenviando === i.id ? 'girar' : undefined} />
                            <span>Enlace nuevo</span>
                          </button>
                          <button
                            className="icono-accion peligro"
                            type="button"
                            onClick={() => setAnular(i)}
                            aria-label={`Anular la invitación de ${i.nombreCompleto}`}
                            title="Anular invitación"
                          >
                            <Icono nombre="papelera" tamano={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {cajon && (
        <Cajon titulo="Nuevo usuario" antetitulo="Nueva cuenta" alCerrar={() => setCajon(false)} alEnviar={crear} bloqueada={form.ocupado} style={{ width: 'min(460px, 100vw)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div className="campo">
              <span className="etiqueta">Cómo entra</span>
              <Segmento
                etiqueta="Cómo entra la persona"
                valor={form.modo}
                alCambiar={(modo) => setForm({ ...form, modo, error: '' })}
                opciones={[
                  { valor: 'invitacion', texto: 'Enviar invitación' },
                  { valor: 'clave', texto: 'Contraseña inicial' },
                ]}
              />
              <span className="suave">
                {form.modo === 'invitacion'
                  ? 'Recibe un enlace para activar su cuenta y elegir su contraseña. Vence en 7 días.'
                  : 'Usted elige la contraseña y se la comparte; la persona puede cambiarla en Mi cuenta.'}
              </span>
            </div>
            <label className="campo">
              <span className="etiqueta">Nombre completo</span>
              <input
                className="control"
                maxLength={LONGITUDES.nombreCompleto}
                autoComplete="off"
                placeholder="Nombre y apellido"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value, error: '' })}
              />
            </label>
            <label className="campo">
              <span className="etiqueta">Correo</span>
              <input
                className="control"
                type="email"
                maxLength={256}
                autoComplete="off"
                placeholder="nombre@edeeste.com.do"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value, error: '' })}
              />
            </label>
            <div className="campo">
              <span className="etiqueta">Rol</span>
              {[ROLES.operador, ROLES.administrador].map((rol) => (
                <button key={rol} className={`opcion-radio${form.rol === rol ? ' activa' : ''}`} type="button" onClick={() => setForm({ ...form, rol, error: '' })} aria-pressed={form.rol === rol}>
                  <span className="radio" aria-hidden="true">
                    <span />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <strong style={{ fontSize: 14, color: 'var(--titulo)' }}>{rol}</strong>
                    <span className="suave" style={{ fontSize: 13, lineHeight: '18px' }}>
                      {DESCRIPCION_ROL[rol]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {form.modo === 'clave' && (
              <CampoClave
                etiqueta="Contraseña inicial"
                valor={form.clave}
                alCambiar={(clave) => setForm({ ...form, clave, error: '' })}
                autoComplete="new-password"
                conFortaleza
                generable
                ayuda="Compártala por un canal seguro; la persona puede cambiarla en Mi cuenta."
              />
            )}
            {form.error && (
              <span className="error-campo" role="alert">
                {form.error}
              </span>
            )}
            <div className="pie-ventana" style={{ marginTop: 'auto', paddingTop: 12 }}>
              <button className="boton boton-fantasma" type="button" onClick={() => setCajon(false)} disabled={form.ocupado}>
                Cancelar
              </button>
              <button className="boton boton-primario" type="submit" disabled={form.ocupado}>
                {form.ocupado && <Icono nombre="cargando" className="girar" grosor={2.4} />}
                {form.modo === 'invitacion' ? 'Crear invitación' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </Cajon>
      )}

      {restablecer && <DialogoRestablecer usuario={restablecer} alCerrar={() => setRestablecer(null)} />}

      {enlace && (
        <DialogoEnlace
          titulo={`Invitación para ${enlace.nombre}`}
          descripcion={
            <>
              Compártalo con {enlace.nombre} por un canal seguro (correo o chat de la empresa). Sirve una sola vez y vence el{' '}
              {fechaCorta(enlace.vence)}. <strong style={{ color: 'var(--titulo)' }}>Se muestra una sola vez</strong>: si se pierde, genere uno nuevo.
            </>
          }
          url={enlace.url}
          alCerrar={() => setEnlace(null)}
        />
      )}

      {anular && (
        <Confirmacion
          titulo="¿Anular la invitación?"
          textoConfirmar="Anular invitación"
          peligro
          ocupado={anulando}
          icono={<Icono nombre="advertencia" tamano={22} />}
          alConfirmar={() => void confirmarAnular()}
          alCerrar={() => setAnular(null)}
        >
          El enlace de {anular.nombreCompleto} ({anular.correo}) dejará de servir. Podrá invitarle de nuevo cuando quiera.
        </Confirmacion>
      )}
    </>
  )
}

function DialogoRestablecer({ usuario, alCerrar }: { usuario: Usuario; alCerrar: () => void }) {
  const id = useId()
  const avisar = useAvisos()
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const confirmar = async (e: FormEvent) => {
    e.preventDefault()
    if (!claveValida(clave)) {
      return setError('La contraseña no cumple los requisitos.')
    }
    setOcupado(true)
    try {
      await usuariosApi.restablecerClave(usuario.id, clave)
      alCerrar()
      avisar(`Contraseña de ${usuario.nombreCompleto} restablecida. Compártala por un canal seguro.`)
    } catch (ex) {
      setOcupado(false)
      setError(mensajeDe(ex, 'No se pudo restablecer la contraseña.'))
    }
  }

  return (
    <Dialogo titulo="Restablecer contraseña" idTitulo={id} alCerrar={alCerrar} alEnviar={confirmar} bloqueada={ocupado} style={{ width: 'min(500px, calc(100vw - 32px))' }}>
      <span
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--coral) 20%, transparent)',
          color: 'var(--coral)',
        }}
      >
        <Icono nombre="llave" tamano={22} />
      </span>
      <div>
        <h2 id={id} className="titulo-serif" style={{ margin: '0 0 6px', fontSize: 24, lineHeight: '32px' }}>
          Restablecer contraseña
        </h2>
        <p style={{ fontSize: 14, lineHeight: '21px', color: 'var(--texto)' }}>
          Nueva contraseña para <strong style={{ color: 'var(--titulo)' }}>{usuario.nombreCompleto}</strong> ({usuario.correo}).
        </p>
      </div>
      <CampoClave
        etiqueta="Nueva contraseña"
        valor={clave}
        alCambiar={(valor) => {
          setClave(valor)
          setError('')
        }}
        autoComplete="new-password"
        conFortaleza
        generable
      />
      {error && (
        <span className="error-campo" role="alert">
          {error}
        </span>
      )}
      <div className="pie-ventana">
        <button className="boton boton-fantasma" type="button" onClick={alCerrar} disabled={ocupado}>
          Cancelar
        </button>
        <button className="boton boton-primario" type="submit" disabled={ocupado}>
          {ocupado && <Icono nombre="cargando" className="girar" grosor={2.4} />}
          Restablecer
        </button>
      </div>
    </Dialogo>
  )
}
