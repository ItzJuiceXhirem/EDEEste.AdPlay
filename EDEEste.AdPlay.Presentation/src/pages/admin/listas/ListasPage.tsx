import { useState, type FormEvent } from 'react'
import { AvisoError, Cargando, Insignia } from '../../../components/Comunes'
import { LONGITUDES } from '../../../constants/limites'
import { useAccion, useDatos } from '../../../hooks/useDatos'
import { listasApi } from '../../../services/adminApi'
import { EditorLista } from './EditorLista'
import { SeccionAsignaciones } from './SeccionAsignaciones'
import { SeccionPublicaciones } from './SeccionPublicaciones'

export function ListasPage() {
  const listas = useDatos(() => listasApi.listar())
  const accion = useAccion()
  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [nombreNueva, setNombreNueva] = useState('')

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    await accion.ejecutar(async () => {
      const lista = await listasApi.crear({ nombre: nombreNueva, estaActiva: true, elementos: [] })
      setNombreNueva('')
      await listas.recargar()
      setSeleccionada(lista.id)
    })
  }

  return (
    <>
      <h1>Listas de reproducción</h1>
      <AvisoError mensaje={accion.error ?? listas.error} />
      <div className="columnas">
        <section className="tarjeta">
          <form className="fila" onSubmit={crear} style={{ marginBottom: 12 }}>
            <label className="campo" style={{ flex: 1 }}>
              Nueva lista
              <input required maxLength={LONGITUDES.nombre} value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} />
            </label>
            <button className="primario" disabled={accion.ocupado}>Crear</button>
          </form>
          <Cargando activo={listas.cargando}>
            <ul className="lista-seleccionable">
              {(listas.datos ?? []).map((l) => (
                <li key={l.id}>
                  <button className={l.id === seleccionada ? 'seleccionado' : ''} onClick={() => setSeleccionada(l.id)}>
                    <span>{l.nombre} {!l.estaActiva && <Insignia>Inactiva</Insignia>}</span>
                    <span className="suave">{l.cantidadElementos} anuncios</span>
                  </button>
                </li>
              ))}
            </ul>
          </Cargando>
        </section>

        <div>
          {seleccionada === null
            ? <section className="tarjeta"><p className="suave">Seleccione o cree una lista para editarla.</p></section>
            : <DetalleLista key={seleccionada} listaId={seleccionada} alGuardar={listas.recargar} />}
        </div>
      </div>
    </>
  )
}

function DetalleLista({ listaId, alGuardar }: { listaId: number; alGuardar: () => Promise<void> }) {
  const lista = useDatos(() => listasApi.obtener(listaId), [listaId])
  const publicaciones = useDatos(() => listasApi.publicaciones(listaId), [listaId])

  return (
    <Cargando activo={lista.cargando}>
      <AvisoError mensaje={lista.error} />
      {lista.datos && (
        <>
          <EditorLista
            lista={lista.datos}
            alGuardar={async () => { await lista.recargar(); await alGuardar() }}
            alPublicar={publicaciones.recargar}
          />
          <SeccionAsignaciones listaId={listaId} />
          <SeccionPublicaciones publicaciones={publicaciones.datos ?? []} recargar={publicaciones.recargar} />
        </>
      )}
    </Cargando>
  )
}
