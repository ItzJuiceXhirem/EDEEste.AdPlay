import { Fragment, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { AvisoError, CabeceraPagina, Esqueleto, Migas } from '../../components/Comunes'
import { Icono } from '../../components/Icono'
import { Paginacion } from '../../components/Paginacion'
import { useDatos } from '../../hooks/useDatos'
import { auditoriaApi, type FiltroAuditoria } from '../../services/consultasApi'
import { usuariosApi } from '../../services/sesionApi'
import type { AccionAuditoria } from '../../types/api'
import { localAUtc } from '../../utils/formato'

const POR_PAGINA = 15

const ACCIONES: [AccionAuditoria, string][] = [
  ['IniciarSesion', 'Inicio de sesión'],
  ['InicioSesionFallido', 'Inicio de sesión fallido'],
  ['Crear', 'Crear'],
  ['Editar', 'Editar'],
  ['Habilitar', 'Habilitar'],
  ['Deshabilitar', 'Deshabilitar'],
  ['Eliminar', 'Eliminar'],
  ['Archivar', 'Archivar'],
  ['Restaurar', 'Restaurar'],
  ['Publicar', 'Publicar'],
  ['Retirar', 'Retirar versión'],
  ['Exportar', 'Exportar'],
  ['GenerarToken', 'Generar enlace de pantalla'],
  ['RevocarToken', 'Revocar enlace de pantalla'],
  ['CambiarClave', 'Cambiar contraseña'],
  ['RestablecerClave', 'Restablecer contraseña'],
  ['CambiarFoto', 'Cambiar foto de perfil'],
  ['Invitar', 'Invitar'],
  ['RevocarInvitacion', 'Anular invitación'],
  ['ActivarCuenta', 'Activar cuenta'],
]
const TEXTO_ACCION = new Map(ACCIONES)

/** Coincide con Domain/Common/ClasificacionAuditoria en la API. */
const RIESGO = new Set<AccionAuditoria>(['InicioSesionFallido', 'Eliminar', 'Retirar', 'Deshabilitar', 'RevocarToken'])

/** Tipos de elemento que registra la API (nombre de la entidad) con su nombre para mostrar. */
const TIPOS: Record<string, string> = {
  Usuario: 'Usuario',
  Sucursal: 'Sucursal',
  GrupoPantalla: 'Grupo de pantallas',
  Pantalla: 'Pantalla',
  ArchivoMultimedia: 'Archivo multimedia',
  Anuncio: 'Anuncio',
  ListaReproduccion: 'Lista',
  AsignacionLista: 'Asignación',
  PublicacionLista: 'Publicación',
  Exportacion: 'Paquete ZIP',
  Invitacion: 'Invitación',
}

const FILTROS_VACIOS = { desde: '', hasta: '', usuario: '', accion: '' as AccionAuditoria | '', tipo: '' }

function claseAccion(accion: AccionAuditoria): string {
  if (accion === 'InicioSesionFallido') {
    return 'chip-desconectada'
  }
  if (RIESGO.has(accion)) {
    return 'chip-desactualizada'
  }
  if (accion === 'Publicar') {
    return 'chip-coral'
  }
  return accion === 'Crear' ? 'chip-en-linea' : ''
}

function textoDia(utc: string): string {
  const d = new Date(utc)
  const hoy = new Date()
  const ayer = new Date(hoy.getTime() - 86_400_000)
  if (d.toDateString() === hoy.toDateString()) {
    return 'Hoy'
  }
  if (d.toDateString() === ayer.toDateString()) {
    return 'Ayer'
  }
  return d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function corto(local: string) {
  return new Date(local).toLocaleString('es-DO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function AuditoriaPage() {
  const usuarios = useDatos(() => usuariosApi.listar())
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [pagina, setPagina] = useState(1)

  const filtro: FiltroAuditoria = {
    desde: localAUtc(filtros.desde) ?? undefined,
    hasta: localAUtc(filtros.hasta) ?? undefined,
    usuarioId: filtros.usuario ? Number(filtros.usuario) : undefined,
    accion: filtros.accion,
    tipoEntidad: filtros.tipo || undefined,
  }
  const clave = JSON.stringify(filtro)
  const resumen = useDatos(() => auditoriaApi.resumen(filtro), [clave])
  const total = useDatos(() => auditoriaApi.resumen({}), [])
  const registros = useDatos(() => auditoriaApi.listar({ ...filtro, pagina, tamanoPagina: POR_PAGINA }), [clave, pagina])

  const cambiar = (cambio: Partial<typeof FILTROS_VACIOS>) => {
    setFiltros({ ...filtros, ...cambio })
    setPagina(1)
  }
  const limpiar = () => {
    setFiltros(FILTROS_VACIOS)
    setPagina(1)
  }

  const listaUsuarios = [...(usuarios.datos ?? [])].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'))
  const fotoDe = new Map(listaUsuarios.map((u) => [u.id, u.fotoVersion]))

  const chips: { texto: string; quitar: () => void }[] = []
  if (filtros.desde) chips.push({ texto: `Desde ${corto(filtros.desde)}`, quitar: () => cambiar({ desde: '' }) })
  if (filtros.hasta) chips.push({ texto: `Hasta ${corto(filtros.hasta)}`, quitar: () => cambiar({ hasta: '' }) })
  if (filtros.usuario) {
    chips.push({ texto: listaUsuarios.find((u) => String(u.id) === filtros.usuario)?.nombreCompleto ?? 'Usuario', quitar: () => cambiar({ usuario: '' }) })
  }
  if (filtros.accion) chips.push({ texto: TEXTO_ACCION.get(filtros.accion) ?? filtros.accion, quitar: () => cambiar({ accion: '' }) })
  if (filtros.tipo) chips.push({ texto: TIPOS[filtros.tipo] ?? filtros.tipo, quitar: () => cambiar({ tipo: '' }) })

  const r = resumen.datos
  const datos = [
    {
      etiqueta: 'Registros',
      valor: r?.total,
      ayuda: chips.length === 0 ? 'Sin filtros' : total.datos ? `de ${total.datos.total} en total` : '',
    },
    { etiqueta: 'Acciones de riesgo', valor: r?.accionesDeRiesgo, ayuda: 'Eliminar, retirar, deshabilitar…' },
    { etiqueta: 'Inicios fallidos', valor: r?.iniciosSesionFallidos, ayuda: 'Correo o contraseña incorrectos' },
    { etiqueta: 'Personas', valor: r?.personas, ayuda: 'Con al menos una acción' },
  ]

  const elementos = registros.datos?.elementos ?? []
  const diaDe = (utc: string) => new Date(utc).toDateString()

  return (
    <>
      <Migas pagina="Auditoría" />
      <CabeceraPagina
        titulo="Auditoría"
        descripcion="Quién hizo qué y cuándo. Los registros se guardan junto con cada cambio y no se pueden editar ni borrar."
      />
      <AvisoError mensaje={registros.error ?? resumen.error} />

      <section aria-label="Resumen" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {datos.map((d, i) => (
          <div key={d.etiqueta} className="dato" style={{ animationDelay: `${(0.05 + i * 0.05).toFixed(2)}s` }}>
            <span className="etiqueta">{d.etiqueta}</span>
            <span className="dato-numero">{d.valor ?? '—'}</span>
            <span className="suave">{d.ayuda}</span>
          </div>
        ))}
      </section>

      <section className="tarjeta entrada" aria-label="Filtros" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '.1s' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
          <label className="campo">
            <span className="etiqueta">Desde</span>
            <input className="control" type="datetime-local" value={filtros.desde} onChange={(e) => cambiar({ desde: e.target.value })} />
          </label>
          <label className="campo">
            <span className="etiqueta">Hasta</span>
            <input className="control" type="datetime-local" value={filtros.hasta} onChange={(e) => cambiar({ hasta: e.target.value })} />
          </label>
          <label className="campo">
            <span className="etiqueta">Usuario</span>
            <select className="control" value={filtros.usuario} onChange={(e) => cambiar({ usuario: e.target.value })}>
              <option value="">Todos</option>
              {listaUsuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombreCompleto}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span className="etiqueta">Acción</span>
            <select className="control" value={filtros.accion} onChange={(e) => cambiar({ accion: e.target.value as AccionAuditoria | '' })}>
              <option value="">Todas</option>
              {ACCIONES.map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span className="etiqueta">Tipo de elemento</span>
            <select className="control" value={filtros.tipo} onChange={(e) => cambiar({ tipo: e.target.value })}>
              <option value="">Todos</option>
              {Object.entries(TIPOS).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </label>
        </div>
        {chips.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="suave">Filtrando por:</span>
            {chips.map((c) => (
              <button key={c.texto} className="chip-filtro" type="button" onClick={c.quitar} aria-label={`Quitar filtro ${c.texto}`}>
                <span>{c.texto}</span>
                <span className="equis" aria-hidden="true">
                  <Icono nombre="cerrar" tamano={10} grosor={3} />
                </span>
              </button>
            ))}
            <button className="boton boton-fantasma boton-mini" type="button" onClick={limpiar}>
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

      <section className="tarjeta entrada" style={{ overflow: 'hidden', animationDelay: '.14s' }}>
        {registros.cargando && !registros.datos && (
          <div style={{ padding: 24 }}>
            <Esqueleto alto={44} cantidad={6} />
          </div>
        )}
        {elementos.length > 0 && (
          <div className="tabla-caja">
            <table className="tabla" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Elemento</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {elementos.map((reg, i) => {
                  const encabezado = i === 0 || diaDe(elementos[i - 1].fechaUtc) !== diaDe(reg.fechaUtc)
                  return (
                    <Fragment key={reg.id}>
                      {encabezado && (
                        <tr className="separador">
                          <td colSpan={5}>{textoDia(reg.fechaUtc)}</td>
                        </tr>
                      )}
                      <tr className="fila" style={{ animationDelay: `${(i * 0.035).toFixed(3)}s` }}>
                        <td className="tabular" style={{ whiteSpace: 'nowrap', color: 'var(--titulo)', fontWeight: 700 }}>
                          {new Date(reg.fechaUtc).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {reg.usuarioId ? (
                              <Avatar usuarioId={reg.usuarioId} nombre={reg.nombreUsuario} fotoVersion={fotoDe.get(reg.usuarioId)} />
                            ) : (
                              <span className="iniciales vacio" aria-hidden="true">
                                ?
                              </span>
                            )}
                            <span>{reg.nombreUsuario ?? 'Sin sesión'}</span>
                          </span>
                        </td>
                        <td>
                          <span className={`chip ${claseAccion(reg.accion)}`}>{TEXTO_ACCION.get(reg.accion) ?? reg.accion}</span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--titulo)', fontWeight: 700 }}>{TIPOS[reg.tipoEntidad] ?? reg.tipoEntidad}</span>
                          {reg.entidadId != null && <span className="suave tabular"> #{reg.entidadId}</span>}
                        </td>
                        <td style={{ maxWidth: 380 }}>{reg.detalle ?? '—'}</td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {registros.datos && elementos.length === 0 && (
          <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <p className="suave" style={{ fontSize: 14 }}>
              No hay registros con esos filtros.
            </p>
            {chips.length > 0 && (
              <button className="boton boton-secundario boton-mini" type="button" onClick={limpiar}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}
        <Paginacion pagina={pagina} tamanoPagina={POR_PAGINA} total={registros.datos?.total ?? 0} alCambiar={setPagina} />
      </section>
    </>
  )
}
