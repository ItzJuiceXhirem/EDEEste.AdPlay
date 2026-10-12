import { useState, type FormEvent } from 'react'
import { AvisoError, Cargando, Insignia } from '../../components/Comunes'
import { LONGITUDES } from '../../constants/limites'
import { useAccion, useDatos } from '../../hooks/useDatos'
import { useAuth } from '../../hooks/useAuth'
import { gruposPantallasApi, sucursalesApi } from '../../services/adminApi'
import type { GrupoPantalla, Sucursal } from '../../types/api'

export function SucursalesPage() {
  const { esAdministrador } = useAuth()
  const sucursales = useDatos(() => sucursalesApi.listar())
  const grupos = useDatos(() => gruposPantallasApi.listar())
  const accion = useAccion()

  const [nuevaSucursal, setNuevaSucursal] = useState({ codigo: '', nombre: '' })
  const [nuevoGrupo, setNuevoGrupo] = useState({ sucursalId: '', grupoPadreId: '', nombre: '' })

  const crearSucursal = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await accion.ejecutar(() => sucursalesApi.crear({ ...nuevaSucursal, estaActiva: true }))
    if (ok) {
      setNuevaSucursal({ codigo: '', nombre: '' })
      await sucursales.recargar()
    }
  }

  const alternarSucursal = async (s: Sucursal) => {
    const ok = await accion.ejecutar(() =>
      sucursalesApi.actualizar(s.id, { codigo: s.codigo, nombre: s.nombre, zonaHorariaId: s.zonaHorariaId, estaActiva: !s.estaActiva }),
    )
    if (ok) {
      await sucursales.recargar()
    }
  }

  const crearGrupo = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await accion.ejecutar(() =>
      gruposPantallasApi.crear({
        sucursalId: Number(nuevoGrupo.sucursalId),
        grupoPadreId: nuevoGrupo.grupoPadreId ? Number(nuevoGrupo.grupoPadreId) : null,
        nombre: nuevoGrupo.nombre,
        estaActivo: true,
      }),
    )
    if (ok) {
      setNuevoGrupo({ ...nuevoGrupo, grupoPadreId: '', nombre: '' })
      await grupos.recargar()
    }
  }

  const gruposDeSucursal = (sucursalId: number) => (grupos.datos ?? []).filter((g) => g.sucursalId === sucursalId)

  return (
    <>
      <h1>Sucursales y grupos de pantallas</h1>
      <AvisoError mensaje={accion.error ?? sucursales.error ?? grupos.error} />

      <div className={esAdministrador ? 'columnas' : undefined}>
        {esAdministrador && (
        <div>
          <section className="tarjeta">
            <h2>Nueva sucursal</h2>
            <form className="fila" onSubmit={crearSucursal}>
              <label className="campo">
                Código
                <input required maxLength={LONGITUDES.codigoSucursal} value={nuevaSucursal.codigo}
                  onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, codigo: e.target.value })} />
              </label>
              <label className="campo">
                Nombre
                <input required maxLength={LONGITUDES.nombre} value={nuevaSucursal.nombre}
                  onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, nombre: e.target.value })} />
              </label>
              <button className="primario" disabled={accion.ocupado}>Crear</button>
            </form>
          </section>

          <section className="tarjeta">
            <h2>Nuevo grupo (ubicación)</h2>
            <form className="fila" onSubmit={crearGrupo}>
              <label className="campo">
                Sucursal
                <select required value={nuevoGrupo.sucursalId}
                  onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, sucursalId: e.target.value, grupoPadreId: '' })}>
                  <option value="">Seleccione…</option>
                  {(sucursales.datos ?? []).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </label>
              <label className="campo">
                Grupo padre (opcional)
                <select value={nuevoGrupo.grupoPadreId}
                  onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, grupoPadreId: e.target.value })}>
                  <option value="">— Ninguno —</option>
                  {gruposDeSucursal(Number(nuevoGrupo.sucursalId)).map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </label>
              <label className="campo">
                Nombre
                <input required maxLength={LONGITUDES.nombre} value={nuevoGrupo.nombre}
                  onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombre: e.target.value })} />
              </label>
              <button className="primario" disabled={accion.ocupado}>Crear</button>
            </form>
          </section>
        </div>
        )}

        <section className="tarjeta">
          <h2>Estructura</h2>
          <Cargando activo={sucursales.cargando || grupos.cargando}>
            {(sucursales.datos ?? []).map((s) => (
              <div key={s.id} style={{ marginBottom: 14 }}>
                <div className="fila" style={{ alignItems: 'center' }}>
                  <strong>{s.nombre}</strong>
                  <span className="suave">{s.codigo} · {s.zonaHorariaId}</span>
                  {s.estaActiva ? <Insignia tono="exito">Activa</Insignia> : <Insignia>Inactiva</Insignia>}
                  {esAdministrador && (
                    <button className="mini" onClick={() => alternarSucursal(s)} disabled={accion.ocupado}>
                      {s.estaActiva ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                </div>
                <ArbolGrupos grupos={gruposDeSucursal(s.id)} padreId={null} />
              </div>
            ))}
          </Cargando>
        </section>
      </div>
    </>
  )
}

function ArbolGrupos({ grupos, padreId }: { grupos: GrupoPantalla[]; padreId: number | null }) {
  const hijos = grupos.filter((g) => g.grupoPadreId === padreId)
  if (hijos.length === 0) {
    return padreId === null ? <p className="suave">Sin grupos.</p> : null
  }
  return (
    <ul className="arbol">
      {hijos.map((g) => (
        <li key={g.id}>
          {g.nombre} {!g.estaActivo && <Insignia>Inactivo</Insignia>}
          <ArbolGrupos grupos={grupos} padreId={g.id} />
        </li>
      ))}
    </ul>
  )
}
