import { useRef, useState, type FormEvent } from 'react'
import { Interruptor, Segmento } from '../../../components/Comunes'
import { Icono, type NombreIcono } from '../../../components/Icono'
import { Confirmacion } from '../../../components/Ventanas'
import { ZONA_HORARIA_PREDETERMINADA } from '../../../constants/limites'
import { DIAS_SEMANA } from '../../../constants/seguridad'
import { useAuth } from '../../../hooks/useAuth'
import { useAvisos } from '../../../hooks/useAvisos'
import { useDatos } from '../../../hooks/useDatos'
import { asignacionesApi, gruposPantallasApi, pantallasApi, sucursalesApi } from '../../../services/adminApi'
import type { AsignacionLista, DiaSemana, GrupoPantalla, NivelAsignacion, ReglaHorario } from '../../../types/api'
import { localAUtc, plural, utcALocal } from '../../../utils/formato'

/** Horario en edición. Las horas van como "HH:mm", el formato de los campos de hora del navegador. */
interface HorarioEditable {
  clave: number
  dias: DiaSemana[]
  inicio: string
  fin: string
  zona: string
  activo: boolean
}

interface Formulario {
  editandoId: number | null
  nivel: NivelAsignacion
  destino: string
  desde: string
  hasta: string
  horarios: HorarioEditable[]
  error: string
  ocupado: boolean
}

const NIVELES: { valor: NivelAsignacion; texto: string; etiqueta: string; icono: NombreIcono }[] = [
  { valor: 'Sucursal', texto: 'Sucursal', etiqueta: 'Sucursal', icono: 'edificio' },
  { valor: 'GrupoPantalla', texto: 'Grupo', etiqueta: 'Grupo de pantallas', icono: 'ubicacion' },
  { valor: 'Pantalla', texto: 'Pantalla', etiqueta: 'Pantalla', icono: 'pantalla' },
]

const LETRAS: Record<DiaSemana, string> = { Lunes: 'L', Martes: 'M', Miercoles: 'M', Jueves: 'J', Viernes: 'V', Sabado: 'S', Domingo: 'D' }

const zonasConocidas = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

function rutaGrupo(grupos: GrupoPantalla[], id: number): string {
  const nombres: string[] = []
  let actual = grupos.find((g) => g.id === id)
  while (actual) {
    nombres.unshift(actual.nombre)
    const padre = actual.grupoPadreId
    actual = grupos.find((g) => g.id === padre)
  }
  return nombres.join(' › ')
}

function fechaLarga(utc: string) {
  return new Date(utc).toLocaleString('es-DO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function aEditable(regla: ReglaHorario, clave: number): HorarioEditable {
  return {
    clave,
    dias: regla.dias,
    inicio: regla.horaInicio.slice(0, 5),
    fin: regla.horaFin.slice(0, 5),
    zona: regla.zonaHorariaId === ZONA_HORARIA_PREDETERMINADA ? '' : regla.zonaHorariaId,
    activo: regla.estaActiva,
  }
}

interface Props {
  listaId: number
  asignaciones: AsignacionLista[]
  cargando: boolean
  recargar: () => Promise<void>
}

/** Dónde y cuándo se ve la lista: asignaciones a sucursal, grupo o pantalla, con vigencia y franjas semanales. */
export function SeccionAsignaciones({ listaId, asignaciones, cargando, recargar }: Props) {
  const { esAdministrador } = useAuth()
  const avisar = useAvisos()
  const sucursales = useDatos(() => sucursalesApi.listar())
  const grupos = useDatos(() => gruposPantallasApi.listar())
  const pantallas = useDatos(() => pantallasApi.listar())
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [eliminar, setEliminar] = useState<AsignacionLista | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [cambiando, setCambiando] = useState<number | null>(null)
  const claveNueva = useRef(0)

  const listaGrupos = grupos.datos ?? []
  const opciones: Record<NivelAsignacion, { id: number; texto: string }[]> = {
    Sucursal: (sucursales.datos ?? []).map((s) => ({ id: s.id, texto: s.nombre })),
    GrupoPantalla: listaGrupos.map((g) => ({ id: g.id, texto: `${g.nombreSucursal} › ${rutaGrupo(listaGrupos, g.id)}` })),
    Pantalla: (pantallas.datos ?? []).map((p) => ({ id: p.id, texto: `${p.nombre} (${p.codigoPantalla})` })),
  }
  for (const lista of Object.values(opciones)) {
    lista.sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  }

  const cambiar = (cambios: Partial<Formulario>) => formulario && setFormulario({ ...formulario, ...cambios, error: '' })
  const cambiarHorario = (clave: number, cambios: Partial<HorarioEditable>) =>
    formulario && cambiar({ horarios: formulario.horarios.map((h) => (h.clave === clave ? { ...h, ...cambios } : h)) })

  const abrirNueva = () =>
    setFormulario({ editandoId: null, nivel: 'Sucursal', destino: '', desde: '', hasta: '', horarios: [], error: '', ocupado: false })

  const abrirEdicion = (a: AsignacionLista) =>
    setFormulario({
      editandoId: a.id,
      nivel: a.nivel,
      destino: String(a.sucursalId ?? a.grupoPantallaId ?? a.pantallaId ?? ''),
      desde: utcALocal(a.fechaInicioUtc),
      hasta: utcALocal(a.fechaFinUtc),
      horarios: a.horarios.map((h) => aEditable(h, claveNueva.current++)),
      error: '',
      ocupado: false,
    })

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    const f = formulario
    if (!f) {
      return
    }
    let error = ''
    if (!f.destino) {
      error = 'Elija el destino de la asignación.'
    } else if (f.desde && f.hasta && f.hasta <= f.desde) {
      error = 'La fecha final debe ser posterior a la inicial.'
    } else if (f.horarios.some((h) => h.dias.length === 0)) {
      error = 'Cada horario necesita al menos un día.'
    } else if (f.horarios.some((h) => !h.inicio || !h.fin || h.fin <= h.inicio)) {
      error = 'En cada horario, la hora final debe ser posterior a la inicial. Para cruzar la medianoche, use dos horarios.'
    }
    if (error) {
      return setFormulario({ ...f, error })
    }

    const id = Number(f.destino)
    const dto = {
      listaReproduccionId: listaId,
      sucursalId: f.nivel === 'Sucursal' ? id : null,
      grupoPantallaId: f.nivel === 'GrupoPantalla' ? id : null,
      pantallaId: f.nivel === 'Pantalla' ? id : null,
      estaHabilitada: f.editandoId === null ? true : (asignaciones.find((a) => a.id === f.editandoId)?.estaHabilitada ?? true),
      fechaInicioUtc: localAUtc(f.desde),
      fechaFinUtc: localAUtc(f.hasta),
      horarios: f.horarios.map((h) => ({
        dias: h.dias,
        horaInicio: `${h.inicio}:00`,
        horaFin: `${h.fin}:00`,
        zonaHorariaId: h.zona.trim() || null,
        estaActiva: h.activo,
      })),
    }
    setFormulario({ ...f, ocupado: true, error: '' })
    try {
      if (f.editandoId === null) {
        await asignacionesApi.crear(dto)
      } else {
        await asignacionesApi.actualizar(f.editandoId, dto)
      }
      await recargar()
      setFormulario(null)
      const destino = opciones[f.nivel].find((o) => o.id === id)?.texto ?? 'el destino'
      avisar(f.editandoId === null ? `Lista asignada a ${destino}.` : 'Asignación actualizada.')
    } catch (ex) {
      setFormulario((actual) => actual && { ...actual, ocupado: false, error: ex instanceof Error ? ex.message : 'No se pudo guardar la asignación.' })
    }
  }

  const alternar = async (a: AsignacionLista) => {
    setCambiando(a.id)
    try {
      // Sin «horarios» la API conserva los actuales.
      await asignacionesApi.actualizar(a.id, {
        listaReproduccionId: a.listaReproduccionId,
        sucursalId: a.sucursalId,
        grupoPantallaId: a.grupoPantallaId,
        pantallaId: a.pantallaId,
        estaHabilitada: !a.estaHabilitada,
        fechaInicioUtc: a.fechaInicioUtc,
        fechaFinUtc: a.fechaFinUtc,
      })
      await recargar()
      avisar(`Asignación de ${a.nombreDestino} ${a.estaHabilitada ? 'deshabilitada' : 'habilitada'}.`)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo cambiar la asignación.', { error: true })
    } finally {
      setCambiando(null)
    }
  }

  const confirmarEliminar = async () => {
    if (!eliminar) {
      return
    }
    setEliminando(true)
    try {
      await asignacionesApi.eliminar(eliminar.id)
      if (formulario?.editandoId === eliminar.id) {
        setFormulario(null)
      }
      await recargar()
      setEliminar(null)
      avisar('Asignación eliminada.')
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo eliminar la asignación.', { error: true })
    } finally {
      setEliminando(false)
    }
  }

  const nivelActual = NIVELES.find((n) => n.valor === formulario?.nivel) ?? NIVELES[0]

  return (
    <section className="tarjeta entrada" aria-labelledby="titulo-asignaciones" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 620 }}>
          <h2 id="titulo-asignaciones" className="titulo-serif" style={{ margin: '0 0 4px', fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
            Dónde y cuándo se ve
          </h2>
          <span className="suave" style={{ fontSize: 13, lineHeight: '19px' }}>
            Prioridad: pantalla › grupo más cercano › sucursal. Con horarios, la asignación solo aplica dentro de esas franjas; fuera de ellas la pantalla usa la siguiente
            en prioridad.
          </span>
        </div>
        {esAdministrador && (
          <button
            className={`boton ${formulario ? 'boton-fantasma' : 'boton-primario'}`}
            type="button"
            onClick={() => (formulario ? setFormulario(null) : abrirNueva())}
            aria-expanded={!!formulario}
          >
            {!formulario && <Icono nombre="mas" grosor={2.2} />}
            <span>{formulario ? 'Cerrar' : 'Nueva asignación'}</span>
          </button>
        )}
      </div>

      {!esAdministrador && (
        <p className="suave" style={{ fontSize: 13 }}>
          Solo un administrador puede crear o modificar asignaciones.
        </p>
      )}

      <div className={`desplegable${formulario ? ' abierto' : ''}`}>
        <div>
          {formulario && (
            <form
              onSubmit={guardar}
              noValidate
              style={{ padding: 20, borderRadius: 14, background: 'var(--sutil)', border: '1px solid var(--borde)', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <strong className="titulo-serif" style={{ fontSize: 18 }}>
                {formulario.editandoId ? 'Editar asignación' : 'Nueva asignación'}
              </strong>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="campo">
                  <span className="etiqueta">Destino</span>
                  <Segmento
                    etiqueta="Tipo de destino"
                    valor={formulario.nivel}
                    alCambiar={(nivel) => cambiar({ nivel, destino: '' })}
                    opciones={NIVELES.map((n) => ({ valor: n.valor, texto: n.texto }))}
                  />
                </div>
                <label className="campo" style={{ flex: '1 1 260px' }}>
                  <span className="etiqueta">{nivelActual.etiqueta}</span>
                  <select className="control" value={formulario.destino} onChange={(e) => cambiar({ destino: e.target.value })}>
                    <option value="">Seleccione…</option>
                    {opciones[formulario.nivel].map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.texto}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <label className="campo">
                  <span className="etiqueta">Vigente desde (opcional)</span>
                  <input className="control" type="datetime-local" value={formulario.desde} onChange={(e) => cambiar({ desde: e.target.value })} />
                </label>
                <label className="campo">
                  <span className="etiqueta">Vigente hasta (opcional)</span>
                  <input className="control" type="datetime-local" value={formulario.hasta} onChange={(e) => cambiar({ hasta: e.target.value })} />
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className="etiqueta">Horarios</span>
                  <span className="suave">
                    {formulario.horarios.length ? plural(formulario.horarios.length, 'franja', 'franjas') : 'Sin horarios: aplica todo el día'}
                  </span>
                </div>
                {formulario.horarios.map((h) => (
                  <div key={h.clave} className="horario">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div className="dias" role="group" aria-label="Días de la semana">
                        {DIAS_SEMANA.map(({ dia, etiqueta }) => {
                          const marcado = h.dias.includes(dia)
                          return (
                            <button
                              key={dia}
                              className={`dia${marcado ? ' marcado' : ''}`}
                              type="button"
                              onClick={() => cambiarHorario(h.clave, { dias: marcado ? h.dias.filter((d) => d !== dia) : [...h.dias, dia] })}
                              aria-pressed={marcado}
                              aria-label={etiqueta}
                              title={etiqueta}
                            >
                              {LETRAS[dia]}
                            </button>
                          )
                        })}
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--titulo)' }}>
                        <Interruptor encendido={h.activo} alCambiar={(activo) => cambiarHorario(h.clave, { activo })} etiqueta="Horario activo" />
                        <span>Activo</span>
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) auto', gap: 12, alignItems: 'end' }}>
                      <label className="campo">
                        <span className="etiqueta">Desde</span>
                        <input className="control" type="time" value={h.inicio} onChange={(e) => cambiarHorario(h.clave, { inicio: e.target.value })} />
                      </label>
                      <label className="campo">
                        <span className="etiqueta">Hasta (no incluida)</span>
                        <input className="control" type="time" value={h.fin} onChange={(e) => cambiarHorario(h.clave, { fin: e.target.value })} />
                      </label>
                      <label className="campo">
                        <span className="etiqueta">Zona horaria</span>
                        <input
                          className="control"
                          list="zonas-horarias"
                          placeholder={ZONA_HORARIA_PREDETERMINADA}
                          value={h.zona}
                          onChange={(e) => cambiarHorario(h.clave, { zona: e.target.value })}
                        />
                      </label>
                      <button
                        className="icono-accion peligro"
                        type="button"
                        onClick={() => cambiar({ horarios: formulario.horarios.filter((x) => x.clave !== h.clave) })}
                        aria-label="Quitar horario"
                        style={{ marginBottom: 4 }}
                      >
                        <Icono nombre="cerrar" tamano={15} grosor={2.2} />
                      </button>
                    </div>
                  </div>
                ))}
                <datalist id="zonas-horarias">
                  {zonasConocidas.map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
                <button
                  className="boton boton-fantasma boton-mini"
                  type="button"
                  onClick={() =>
                    cambiar({
                      horarios: [
                        ...formulario.horarios,
                        { clave: claveNueva.current++, dias: DIAS_SEMANA.slice(0, 5).map((d) => d.dia), inicio: '08:00', fin: '18:00', zona: '', activo: true },
                      ],
                    })
                  }
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Icono nombre="mas" tamano={15} grosor={2.2} />
                  <span>Agregar horario</span>
                </button>
                <span className="suave">Para una franja que cruza la medianoche, use dos horarios (por ejemplo, 22:00–23:59 y 00:00–06:00).</span>
              </div>
              {formulario.error && (
                <span className="error-campo" role="alert">
                  {formulario.error}
                </span>
              )}
              <div className="pie-ventana">
                <button className="boton boton-fantasma" type="button" onClick={() => setFormulario(null)} disabled={formulario.ocupado}>
                  Cancelar
                </button>
                <button className="boton boton-primario" type="submit" disabled={formulario.ocupado}>
                  {formulario.ocupado && <Icono nombre="cargando" className="girar" grosor={2.4} />}
                  {formulario.editandoId ? 'Guardar cambios' : 'Asignar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {!cargando && asignaciones.length === 0 && (
        <p className="suave" style={{ padding: 24, textAlign: 'center', border: '1.5px dashed var(--borde)', borderRadius: 14, fontSize: 13 }}>
          La lista no está asignada a ningún destino.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {asignaciones.map((a, i) => {
          const nivel = NIVELES.find((n) => n.valor === a.nivel) ?? NIVELES[0]
          const estado = !a.estaHabilitada
            ? { texto: 'Deshabilitada', clase: 'chip-deshabilitada' }
            : a.activaAhora
              ? { texto: 'Aplica ahora', clase: 'chip-en-linea' }
              : { texto: 'Fuera de vigencia u horario', clase: 'chip-desactualizada' }
          const vigencia = `${a.fechaInicioUtc ? `Desde ${fechaLarga(a.fechaInicioUtc)}` : 'Desde ya'}${a.fechaFinUtc ? ` hasta ${fechaLarga(a.fechaFinUtc)}` : ', sin fecha de fin'}`
          return (
            <div key={a.id} className={`asignacion${a.estaHabilitada ? '' : ' apagada'}`} style={{ animationDelay: `${(i * 0.05).toFixed(2)}s` }}>
              <span
                aria-hidden="true"
                style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sutil)', color: 'var(--coral)' }}
              >
                <Icono nombre={nivel.icono} tamano={19} />
              </span>
              <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="chip" style={{ height: 22 }}>
                    {nivel.texto}
                  </span>
                  <strong className="titulo-serif" style={{ fontSize: 17, lineHeight: '23px' }}>
                    {a.nombreDestino}
                  </strong>
                  <span className={`chip ${estado.clase}`}>{estado.texto}</span>
                </div>
                <span className="suave" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icono nombre="calendario" tamano={14} />
                  {vigencia}
                </span>
                {a.horarios.length === 0 && (
                  <span className="suave" style={{ fontSize: 13 }}>
                    Todo el día, todos los días.
                  </span>
                )}
                {a.horarios.map((h) => {
                  const zona = h.zonaHorariaId === ZONA_HORARIA_PREDETERMINADA ? '' : h.zonaHorariaId
                  return (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{ display: 'inline-flex', gap: 3 }}
                        aria-label={DIAS_SEMANA.filter((d) => h.dias.includes(d.dia))
                          .map((d) => d.etiqueta)
                          .join(', ')}
                      >
                        {DIAS_SEMANA.map((d) => (
                          <span key={d.dia} className={`dia-mini${h.dias.includes(d.dia) ? ' marcado' : ''}`} aria-hidden="true">
                            {LETRAS[d.dia]}
                          </span>
                        ))}
                      </span>
                      <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--titulo)' }}>
                        {h.horaInicio.slice(0, 5)}–{h.horaFin.slice(0, 5)}
                      </span>
                      <span className="suave">
                        {zona}
                        {!h.estaActiva && `${zona ? ' · ' : ''}inactivo`}
                      </span>
                    </div>
                  )
                })}
              </div>
              {esAdministrador && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Interruptor
                    encendido={a.estaHabilitada}
                    alCambiar={() => void alternar(a)}
                    etiqueta={`${a.estaHabilitada ? 'Deshabilitar' : 'Habilitar'} asignación de ${a.nombreDestino}`}
                    deshabilitado={cambiando === a.id}
                  />
                  <button className="icono-accion" type="button" onClick={() => abrirEdicion(a)} aria-label={`Editar asignación de ${a.nombreDestino}`} title="Editar">
                    <Icono nombre="editar" tamano={15} />
                  </button>
                  <button className="icono-accion peligro" type="button" onClick={() => setEliminar(a)} aria-label={`Eliminar asignación de ${a.nombreDestino}`} title="Eliminar">
                    <Icono nombre="papelera" tamano={15} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {eliminar && (
        <Confirmacion
          titulo="¿Eliminar esta asignación?"
          textoConfirmar="Eliminar"
          peligro
          ocupado={eliminando}
          icono={<Icono nombre="advertencia" tamano={22} />}
          alConfirmar={() => void confirmarEliminar()}
          alCerrar={() => setEliminar(null)}
        >
          La lista dejará de mostrarse en «{eliminar.nombreDestino}». Si solo quiere pausarla, use el interruptor en su lugar.
        </Confirmacion>
      )}
    </section>
  )
}
