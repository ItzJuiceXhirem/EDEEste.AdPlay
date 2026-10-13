import { useRef, useState, type FormEvent } from 'react'
import { AvisoError, Cargando, Insignia } from '../../../components/Comunes'
import { ZONA_HORARIA_PREDETERMINADA } from '../../../constants/limites'
import { DIAS_SEMANA } from '../../../constants/seguridad'
import { useAccion, useDatos } from '../../../hooks/useDatos'
import { useAuth } from '../../../hooks/useAuth'
import { asignacionesApi, gruposPantallasApi, pantallasApi, sucursalesApi } from '../../../services/adminApi'
import type { AsignacionLista, DiaSemana, NivelAsignacion, ReglaHorario } from '../../../types/api'
import { formatearFecha, localAUtc, utcALocal } from '../../../utils/formato'

interface OpcionDestino {
  id: number
  texto: string
}

/** Horario en edición. Las horas van como "HH:mm", el formato de los campos de hora del navegador. */
interface HorarioEditable {
  clave: number
  dias: DiaSemana[]
  inicio: string
  fin: string
  zona: string
  estaActiva: boolean
}

const zonasConocidas = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

/** Asigna la lista a una sucursal, grupo o pantalla, con vigencia y franjas semanales opcionales. */
export function SeccionAsignaciones({ listaId }: { listaId: number }) {
  const { esAdministrador } = useAuth()
  const asignaciones = useDatos(() => asignacionesApi.listar(listaId), [listaId])
  const sucursales = useDatos(() => sucursalesApi.listar())
  const grupos = useDatos(() => gruposPantallasApi.listar())
  const pantallas = useDatos(() => pantallasApi.listar())
  const accion = useAccion()
  const claveNueva = useRef(0)

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nivel, setNivel] = useState<NivelAsignacion>('Sucursal')
  const [destinoId, setDestinoId] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [horarios, setHorarios] = useState<HorarioEditable[]>([])

  const opcionesPorNivel: Record<NivelAsignacion, OpcionDestino[]> = {
    Sucursal: (sucursales.datos ?? []).map((s) => ({ id: s.id, texto: s.nombre })),
    GrupoPantalla: (grupos.datos ?? []).map((g) => ({ id: g.id, texto: `${g.nombreSucursal} › ${g.nombre}` })),
    Pantalla: (pantallas.datos ?? []).map((p) => ({ id: p.id, texto: `${p.nombre} (${p.codigoPantalla})` })),
  }

  const limpiarFormulario = () => {
    setEditandoId(null)
    setNivel('Sucursal')
    setDestinoId('')
    setInicio('')
    setFin('')
    setHorarios([])
  }

  const editar = (a: AsignacionLista) => {
    setEditandoId(a.id)
    setNivel(a.nivel)
    setDestinoId(String(a.sucursalId ?? a.grupoPantallaId ?? a.pantallaId ?? ''))
    setInicio(utcALocal(a.fechaInicioUtc))
    setFin(utcALocal(a.fechaFinUtc))
    setHorarios(a.horarios.map((h) => aEditable(h, claveNueva.current++)))
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    const id = Number(destinoId)
    const dto = {
      listaReproduccionId: listaId,
      sucursalId: nivel === 'Sucursal' ? id : null,
      grupoPantallaId: nivel === 'GrupoPantalla' ? id : null,
      pantallaId: nivel === 'Pantalla' ? id : null,
      estaHabilitada: true,
      fechaInicioUtc: localAUtc(inicio),
      fechaFinUtc: localAUtc(fin),
      horarios: horarios.map((h) => ({
        dias: h.dias,
        horaInicio: `${h.inicio}:00`,
        horaFin: `${h.fin}:00`,
        zonaHorariaId: h.zona.trim() || null,
        estaActiva: h.estaActiva,
      })),
    }
    const ok = await accion.ejecutar(() =>
      editandoId === null ? asignacionesApi.crear(dto) : asignacionesApi.actualizar(editandoId, dto),
    )
    if (ok) {
      limpiarFormulario()
      await asignaciones.recargar()
    }
  }

  const alternarHabilitada = async (a: AsignacionLista) => {
    const ok = await accion.ejecutar(() =>
      asignacionesApi.actualizar(a.id, {
        listaReproduccionId: a.listaReproduccionId,
        sucursalId: a.sucursalId,
        grupoPantallaId: a.grupoPantallaId,
        pantallaId: a.pantallaId,
        estaHabilitada: !a.estaHabilitada,
        fechaInicioUtc: a.fechaInicioUtc,
        fechaFinUtc: a.fechaFinUtc,
      }),
    )
    if (ok) {
      await asignaciones.recargar()
    }
  }

  const eliminar = async (id: number) => {
    if (confirm('¿Eliminar esta asignación?') && (await accion.ejecutar(() => asignacionesApi.eliminar(id)))) {
      if (editandoId === id) {
        limpiarFormulario()
      }
      await asignaciones.recargar()
    }
  }

  const cambiarHorario = (clave: number, cambios: Partial<HorarioEditable>) =>
    setHorarios(horarios.map((h) => (h.clave === clave ? { ...h, ...cambios } : h)))

  const agregarHorario = () =>
    setHorarios([
      ...horarios,
      {
        clave: claveNueva.current++,
        dias: DIAS_SEMANA.slice(0, 5).map((d) => d.dia),
        inicio: '08:00',
        fin: '18:00',
        zona: '',
        estaActiva: true,
      },
    ])

  return (
    <section className="tarjeta">
      <h2>Asignaciones</h2>
      <p className="suave">
        Prioridad al resolver qué ve una pantalla: pantalla › grupo más cercano › sucursal. Una asignación con horarios
        solo aplica dentro de esas franjas; fuera de ellas la pantalla usa la siguiente en prioridad. Sin horarios,
        aplica siempre dentro de su vigencia.
      </p>
      <AvisoError mensaje={accion.error ?? asignaciones.error} />

      {esAdministrador ? (
        <form onSubmit={guardar} style={{ marginBottom: 14 }}>
          <h3>{editandoId === null ? 'Nueva asignación' : `Editando asignación ${editandoId}`}</h3>
          <div className="fila">
            <label className="campo">
              Destino
              <select value={nivel} onChange={(e) => { setNivel(e.target.value as NivelAsignacion); setDestinoId('') }}>
                <option value="Sucursal">Sucursal</option>
                <option value="GrupoPantalla">Grupo</option>
                <option value="Pantalla">Pantalla</option>
              </select>
            </label>
            <label className="campo">
              &nbsp;
              <select required value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
                <option value="">Seleccione…</option>
                {opcionesPorNivel[nivel].map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
              </select>
            </label>
            <label className="campo">
              Vigente desde (opcional)
              <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
            <label className="campo">
              Vigente hasta (opcional)
              <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
            </label>
          </div>

          {horarios.map((h) => (
            <div className="horario" key={h.clave}>
              <div className="dias" role="group" aria-label="Días de la semana">
                {DIAS_SEMANA.map(({ dia, corta, etiqueta }) => {
                  const marcado = h.dias.includes(dia)
                  return (
                    <label key={dia} className={marcado ? 'marcado' : ''} title={etiqueta}>
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() =>
                          cambiarHorario(h.clave, { dias: marcado ? h.dias.filter((d) => d !== dia) : [...h.dias, dia] })
                        }
                      />
                      {corta}
                    </label>
                  )
                })}
              </div>
              <div className="fila">
                <label className="campo">
                  Desde
                  <input type="time" required value={h.inicio} onChange={(e) => cambiarHorario(h.clave, { inicio: e.target.value })} />
                </label>
                <label className="campo">
                  Hasta (no incluida)
                  <input type="time" required value={h.fin} onChange={(e) => cambiarHorario(h.clave, { fin: e.target.value })} />
                </label>
                <label className="campo">
                  Zona horaria
                  <input
                    list="zonas-horarias"
                    placeholder={ZONA_HORARIA_PREDETERMINADA}
                    value={h.zona}
                    onChange={(e) => cambiarHorario(h.clave, { zona: e.target.value })}
                  />
                </label>
                <label className="casilla">
                  <input type="checkbox" checked={h.estaActiva} onChange={(e) => cambiarHorario(h.clave, { estaActiva: e.target.checked })} />
                  Activo
                </label>
                <button type="button" className="mini peligro" onClick={() => setHorarios(horarios.filter((x) => x.clave !== h.clave))}>
                  Quitar horario
                </button>
              </div>
            </div>
          ))}
          <datalist id="zonas-horarias">
            {zonasConocidas.map((z) => <option key={z} value={z} />)}
          </datalist>

          <div className="fila" style={{ marginTop: 8 }}>
            <button type="button" onClick={agregarHorario}>+ Agregar horario</button>
            <button className="primario" disabled={accion.ocupado}>{editandoId === null ? 'Asignar' : 'Guardar cambios'}</button>
            {editandoId !== null && <button type="button" onClick={limpiarFormulario}>Cancelar</button>}
          </div>
          <p className="suave">Para una franja que cruza la medianoche, use dos horarios (por ejemplo, 22:00–23:59 y 00:00–06:00).</p>
        </form>
      ) : (
        <p className="suave">Solo un administrador puede crear o modificar asignaciones.</p>
      )}

      <Cargando activo={asignaciones.cargando}>
        <table>
          <tbody>
            {(asignaciones.datos ?? []).map((a) => (
              <tr key={a.id}>
                <td>
                  <Insignia>{a.nivel === 'GrupoPantalla' ? 'Grupo' : a.nivel}</Insignia> {a.nombreDestino}
                  {a.horarios.length > 0 && (
                    <div className="suave">{a.horarios.map(resumirHorario).join(' · ')}</div>
                  )}
                </td>
                <td className="suave">{formatearFecha(a.fechaInicioUtc)} → {formatearFecha(a.fechaFinUtc)}</td>
                <td>
                  {!a.estaHabilitada && <Insignia>Deshabilitada</Insignia>}
                  {a.estaHabilitada && a.activaAhora && <Insignia tono="exito">Aplica ahora</Insignia>}
                  {a.estaHabilitada && !a.activaAhora && <Insignia tono="aviso">Fuera de vigencia u horario</Insignia>}
                </td>
                {esAdministrador && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="mini" onClick={() => editar(a)} disabled={accion.ocupado}>Editar</button>{' '}
                    <button className="mini" onClick={() => alternarHabilitada(a)} disabled={accion.ocupado}>
                      {a.estaHabilitada ? 'Deshabilitar' : 'Habilitar'}
                    </button>{' '}
                    <button className="mini peligro" onClick={() => eliminar(a.id)} disabled={accion.ocupado}>Eliminar</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {asignaciones.datos?.length === 0 && <p className="suave">La lista no está asignada a ningún destino.</p>}
      </Cargando>
    </section>
  )
}

function aEditable(regla: ReglaHorario, clave: number): HorarioEditable {
  return {
    clave,
    dias: regla.dias,
    inicio: regla.horaInicio.slice(0, 5),
    fin: regla.horaFin.slice(0, 5),
    zona: regla.zonaHorariaId === ZONA_HORARIA_PREDETERMINADA ? '' : regla.zonaHorariaId,
    estaActiva: regla.estaActiva,
  }
}

function resumirHorario(regla: ReglaHorario): string {
  const dias = DIAS_SEMANA.filter((d) => regla.dias.includes(d.dia)).map((d) => d.corta).join(' ')
  const zona = regla.zonaHorariaId === ZONA_HORARIA_PREDETERMINADA ? '' : ` (${regla.zonaHorariaId})`
  return `${dias} ${regla.horaInicio.slice(0, 5)}–${regla.horaFin.slice(0, 5)}${zona}${regla.estaActiva ? '' : ' [inactivo]'}`
}
