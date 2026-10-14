import { useState, type FormEvent } from 'react'
import { AvisoError, CabeceraPagina, Esqueleto, Migas } from '../../components/Comunes'
import { Icono } from '../../components/Icono'
import { LONGITUDES, ZONA_HORARIA_PREDETERMINADA } from '../../constants/limites'
import { useAuth } from '../../hooks/useAuth'
import { useAvisos } from '../../hooks/useAvisos'
import { useDatos } from '../../hooks/useDatos'
import { gruposPantallasApi, pantallasApi, sucursalesApi } from '../../services/adminApi'
import type { GrupoPantalla, Sucursal } from '../../types/api'
import { plural } from '../../utils/formato'
import './sucursales.css'

/** Grupos en orden de árbol (cada padre seguido de sus hijos) con su profundidad. */
function aplanar(grupos: GrupoPantalla[], padreId: number | null, profundidad: number): (GrupoPantalla & { profundidad: number })[] {
  return grupos
    .filter((g) => g.grupoPadreId === padreId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .flatMap((g) => [{ ...g, profundidad }, ...aplanar(grupos, g.id, profundidad + 1)])
}

function rutaDe(grupos: GrupoPantalla[], id: number): string[] {
  const ruta: string[] = []
  let actual = grupos.find((g) => g.id === id)
  while (actual) {
    ruta.unshift(actual.nombre)
    const padre = actual.grupoPadreId
    actual = grupos.find((g) => g.id === padre)
  }
  return ruta
}

function mensajeDe(e: unknown) {
  return e instanceof Error ? e.message : 'No se pudo guardar.'
}

export function SucursalesPage() {
  const { esAdministrador } = useAuth()
  const avisar = useAvisos()
  const sucursales = useDatos(() => sucursalesApi.listar())
  const grupos = useDatos(() => gruposPantallasApi.listar())
  const pantallas = useDatos(() => pantallasApi.listar())
  const [cerradas, setCerradas] = useState<Record<number, boolean>>({})
  const [nuevas, setNuevas] = useState<Record<string, boolean>>({})
  const [formSucursal, setFormSucursal] = useState({ codigo: '', nombre: '', error: '', ocupado: false })
  const [formGrupo, setFormGrupo] = useState({ sucursalId: '', padreId: '', nombre: '', error: '', ocupado: false })
  const [cambiando, setCambiando] = useState<number | null>(null)

  const listaSucursales = [...(sucursales.datos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const listaGrupos = grupos.datos ?? []
  const pantallasPorGrupo = new Map<number, number>()
  for (const p of pantallas.datos ?? []) {
    pantallasPorGrupo.set(p.grupoPantallaId, (pantallasPorGrupo.get(p.grupoPantallaId) ?? 0) + 1)
  }

  const sucursalElegida = listaSucursales.find((s) => String(s.id) === formGrupo.sucursalId)
  const gruposElegida = sucursalElegida ? listaGrupos.filter((g) => g.sucursalId === sucursalElegida.id) : []
  const ruta = sucursalElegida
    ? [sucursalElegida.nombre, ...(formGrupo.padreId ? rutaDe(listaGrupos, Number(formGrupo.padreId)) : []), formGrupo.nombre.trim() || 'Nuevo grupo']
    : []

  const crearSucursal = async (e: FormEvent) => {
    e.preventDefault()
    const codigo = formSucursal.codigo.trim().toUpperCase()
    const nombre = formSucursal.nombre.trim()
    if (!codigo || !nombre) {
      return setFormSucursal({ ...formSucursal, error: 'Escriba el código y el nombre de la sucursal.' })
    }
    if (listaSucursales.some((s) => s.codigo.toUpperCase() === codigo)) {
      return setFormSucursal({ ...formSucursal, error: `Ya existe una sucursal con el código ${codigo}.` })
    }
    setFormSucursal({ ...formSucursal, ocupado: true, error: '' })
    try {
      const creada = await sucursalesApi.crear({ codigo, nombre, estaActiva: true })
      setNuevas((n) => ({ ...n, [`s${creada.id}`]: true }))
      setFormSucursal({ codigo: '', nombre: '', error: '', ocupado: false })
      await sucursales.recargar()
      avisar(`Sucursal «${nombre}» creada.`)
    } catch (ex) {
      setFormSucursal((f) => ({ ...f, ocupado: false, error: mensajeDe(ex) }))
    }
  }

  const crearGrupo = async (e: FormEvent) => {
    e.preventDefault()
    const nombre = formGrupo.nombre.trim()
    if (!formGrupo.sucursalId || !nombre) {
      return setFormGrupo({ ...formGrupo, error: 'Elija la sucursal y escriba el nombre del grupo.' })
    }
    const sucursalId = Number(formGrupo.sucursalId)
    setFormGrupo({ ...formGrupo, ocupado: true, error: '' })
    try {
      const creado = await gruposPantallasApi.crear({
        sucursalId,
        grupoPadreId: formGrupo.padreId ? Number(formGrupo.padreId) : null,
        nombre,
        estaActivo: true,
      })
      setNuevas((n) => ({ ...n, [`g${creado.id}`]: true }))
      setCerradas((c) => ({ ...c, [sucursalId]: false }))
      setFormGrupo({ sucursalId: formGrupo.sucursalId, padreId: '', nombre: '', error: '', ocupado: false })
      await grupos.recargar()
      avisar(`Grupo «${nombre}» creado.`)
    } catch (ex) {
      setFormGrupo((f) => ({ ...f, ocupado: false, error: mensajeDe(ex) }))
    }
  }

  const alternarActiva = async (s: Sucursal) => {
    setCambiando(s.id)
    try {
      await sucursalesApi.actualizar(s.id, { codigo: s.codigo, nombre: s.nombre, zonaHorariaId: s.zonaHorariaId, estaActiva: !s.estaActiva })
      await sucursales.recargar()
      avisar(`Sucursal «${s.nombre}» ${s.estaActiva ? 'desactivada' : 'activada'}.`)
    } catch (ex) {
      avisar(mensajeDe(ex), { error: true })
    } finally {
      setCambiando(null)
    }
  }

  const cargando = (sucursales.cargando && !sucursales.datos) || (grupos.cargando && !grupos.datos)

  return (
    <>
      <Migas pagina="Sucursales y grupos" />

      <CabeceraPagina
        titulo="Sucursales y grupos"
        descripcion="Organice dónde están las pantallas. Los grupos se pueden anidar para reflejar ubicaciones dentro de una sucursal; una pantalla recibe el contenido de su grupo más cercano si no tiene uno propio."
      >
        <span className="chip" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>
          {plural(listaSucursales.length, 'sucursal', 'sucursales')}
        </span>
        <span className="chip" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>
          {plural(listaGrupos.length, 'grupo', 'grupos')}
        </span>
      </CabeceraPagina>

      <AvisoError mensaje={sucursales.error ?? grupos.error ?? pantallas.error} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        {esAdministrador && (
          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
            <form className="tarjeta entrada" onSubmit={crearSucursal} noValidate style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animationDelay: '.08s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <IconoTarjeta icono="edificioMas" />
                <h2 className="titulo-serif" style={{ fontSize: 20, lineHeight: '28px' }}>
                  Nueva sucursal
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 12 }}>
                <label className="campo">
                  <span className="etiqueta">Código</span>
                  <input
                    className="control"
                    maxLength={LONGITUDES.codigoSucursal}
                    placeholder="LRO"
                    value={formSucursal.codigo}
                    onChange={(e) => setFormSucursal({ ...formSucursal, codigo: e.target.value, error: '' })}
                    style={{ textTransform: 'uppercase' }}
                  />
                </label>
                <label className="campo">
                  <span className="etiqueta">Nombre</span>
                  <input
                    className="control"
                    maxLength={LONGITUDES.nombre}
                    placeholder="Oficina Comercial …"
                    value={formSucursal.nombre}
                    onChange={(e) => setFormSucursal({ ...formSucursal, nombre: e.target.value, error: '' })}
                  />
                </label>
              </div>
              {formSucursal.error && (
                <span className="error-campo" role="alert">
                  {formSucursal.error}
                </span>
              )}
              <div className="ruta">
                <Icono nombre="reloj" tamano={14} />
                <span>
                  Zona horaria: <strong>{ZONA_HORARIA_PREDETERMINADA}</strong>
                </span>
              </div>
              <button className="boton boton-primario" type="submit" style={{ alignSelf: 'flex-start' }} disabled={formSucursal.ocupado}>
                <Icono nombre={formSucursal.ocupado ? 'cargando' : 'mas'} grosor={2.2} className={formSucursal.ocupado ? 'girar' : undefined} />
                <span>Crear sucursal</span>
              </button>
            </form>

            <form className="tarjeta entrada" onSubmit={crearGrupo} noValidate style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animationDelay: '.16s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <IconoTarjeta icono="ubicacion" />
                <div>
                  <h2 className="titulo-serif" style={{ fontSize: 20, lineHeight: '28px' }}>
                    Nuevo grupo
                  </h2>
                  <span className="suave">Una ubicación dentro de la sucursal</span>
                </div>
              </div>
              <label className="campo">
                <span className="etiqueta">Sucursal</span>
                <select
                  className="control"
                  value={formGrupo.sucursalId}
                  onChange={(e) => setFormGrupo({ ...formGrupo, sucursalId: e.target.value, padreId: '', error: '' })}
                >
                  <option value="">Seleccione…</option>
                  {listaSucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span className="etiqueta">Dentro de (opcional)</span>
                <select
                  className="control"
                  value={formGrupo.padreId}
                  onChange={(e) => setFormGrupo({ ...formGrupo, padreId: e.target.value, error: '' })}
                  disabled={!sucursalElegida}
                >
                  <option value="">— Directamente en la sucursal —</option>
                  {aplanar(gruposElegida, null, 0).map((g) => (
                    <option key={g.id} value={g.id}>
                      {rutaDe(listaGrupos, g.id).join(' › ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span className="etiqueta">Nombre</span>
                <input
                  className="control"
                  maxLength={LONGITUDES.nombre}
                  placeholder="Sala de espera"
                  value={formGrupo.nombre}
                  onChange={(e) => setFormGrupo({ ...formGrupo, nombre: e.target.value, error: '' })}
                />
              </label>
              {formGrupo.error && (
                <span className="error-campo" role="alert">
                  {formGrupo.error}
                </span>
              )}
              {ruta.length > 0 && (
                <div className="ruta" style={{ animation: 'aparecer .3s ease both' }}>
                  <span>Se creará en:</span>
                  {ruta.map((texto, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <strong>{texto}</strong>
                      {i < ruta.length - 1 && <Icono nombre="derecha" tamano={12} grosor={2.4} />}
                    </span>
                  ))}
                </div>
              )}
              <button className="boton boton-primario" type="submit" style={{ alignSelf: 'flex-start' }} disabled={formGrupo.ocupado}>
                <Icono nombre={formGrupo.ocupado ? 'cargando' : 'mas'} grosor={2.2} className={formGrupo.ocupado ? 'girar' : undefined} />
                <span>Crear grupo</span>
              </button>
            </form>
          </div>
        )}

        <section
          className="tarjeta entrada"
          style={{ flex: '999 1 520px', minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 18, animationDelay: '.12s' }}
          aria-labelledby="titulo-estructura"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 id="titulo-estructura" className="titulo-serif" style={{ fontSize: 24, lineHeight: '32px' }}>
              Estructura
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="boton boton-fantasma boton-mini" type="button" onClick={() => setCerradas({})}>
                Expandir todo
              </button>
              <button
                className="boton boton-fantasma boton-mini"
                type="button"
                onClick={() => setCerradas(Object.fromEntries(listaSucursales.map((s) => [s.id, true])))}
              >
                Contraer todo
              </button>
            </div>
          </div>

          {cargando && <Esqueleto alto={72} cantidad={3} />}
          {!cargando && listaSucursales.length === 0 && (
            <p className="suave" style={{ fontSize: 14 }}>
              Todavía no hay sucursales.{esAdministrador ? ' Cree la primera con «Nueva sucursal».' : ''}
            </p>
          )}

          {listaSucursales.map((s, i) => {
            const propios = listaGrupos.filter((g) => g.sucursalId === s.id)
            const abierta = !cerradas[s.id]
            const cantidad = propios.reduce((n, g) => n + (pantallasPorGrupo.get(g.id) ?? 0), 0)
            const clase = ['bloque entrada', abierta ? '' : 'cerrada', s.estaActiva ? '' : 'inactiva', nuevas[`s${s.id}`] ? 'nuevo' : ''].join(' ')
            return (
              <div key={s.id} className={clase} style={{ animationDelay: `${(0.18 + i * 0.07).toFixed(2)}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px' }}>
                  <button className="cabecera-bloque" type="button" onClick={() => setCerradas({ ...cerradas, [s.id]: abierta })} aria-expanded={abierta}>
                    <Icono nombre="abajo" className="cheuron" />
                    <IconoTarjeta icono="edificio" />
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <strong style={{ fontSize: 15, lineHeight: '20px', color: 'var(--titulo)' }}>{s.nombre}</strong>
                      <span className="suave">
                        {s.codigo} · {s.zonaHorariaId} · {plural(cantidad, 'pantalla', 'pantallas')}
                      </span>
                    </span>
                  </button>
                  <span className={`chip ${s.estaActiva ? 'chip-en-linea' : 'chip-neutro'}`}>{s.estaActiva ? 'Activa' : 'Inactiva'}</span>
                  {esAdministrador && (
                    <button className="boton boton-contorno boton-mini" type="button" onClick={() => void alternarActiva(s)} disabled={cambiando === s.id}>
                      {s.estaActiva ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                </div>
                <div className="cuerpo">
                  <div>
                    <div style={{ padding: '0 16px 14px 44px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {propios.length === 0 && (
                        <p className="suave" style={{ padding: '6px 0' }}>
                          Sin grupos todavía.{esAdministrador ? ' Cree uno desde «Nuevo grupo».' : ''}
                        </p>
                      )}
                      {aplanar(propios, null, 0).map((g) => {
                        const tieneHijos = propios.some((h) => h.grupoPadreId === g.id)
                        const cantidadGrupo = pantallasPorGrupo.get(g.id) ?? 0
                        return (
                          <div
                            key={g.id}
                            className={`rama${nuevas[`g${g.id}`] ? ' nuevo' : ''}${g.estaActivo ? '' : ' inactivo'}`}
                            style={{ marginLeft: g.profundidad * 28 }}
                          >
                            <span aria-hidden="true" style={{ display: 'flex', color: 'var(--malva)' }}>
                              <Icono nombre={tieneHijos ? 'carpeta' : 'ubicacion'} tamano={16} />
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--titulo)' }}>{g.nombre}</span>
                            {!g.estaActivo && <span className="chip chip-neutro">Inactivo</span>}
                            <span className="suave" style={{ marginLeft: 'auto' }}>
                              {cantidadGrupo ? plural(cantidadGrupo, 'pantalla', 'pantallas') : 'Sin pantallas'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </>
  )
}

function IconoTarjeta({ icono }: { icono: 'edificio' | 'edificioMas' | 'ubicacion' }) {
  return (
    <span
      aria-hidden="true"
      style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sutil)', color: 'var(--primario)' }}
    >
      <Icono nombre={icono} />
    </span>
  )
}
