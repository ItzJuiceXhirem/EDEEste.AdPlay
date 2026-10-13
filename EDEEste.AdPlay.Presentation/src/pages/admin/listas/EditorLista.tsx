import { useRef, useState } from 'react'
import { AvisoError } from '../../../components/Comunes'
import { DURACION_SEGUNDOS, LONGITUDES } from '../../../constants/limites'
import { useAccion, useDatos } from '../../../hooks/useDatos'
import { useAuth } from '../../../hooks/useAuth'
import { anunciosApi, listasApi } from '../../../services/adminApi'
import type { ListaReproduccion } from '../../../types/api'

interface ElementoEditable {
  /** Identificador local para las claves de React; los elementos nuevos aún no tienen id en el servidor. */
  clave: number
  anuncioId: number
  titulo: string
  duracionPersonalizada: string
}

interface Props {
  lista: ListaReproduccion
  alGuardar: () => Promise<void>
  alPublicar: () => Promise<void>
}

/** Edita los datos de una lista y el orden y la duración de sus anuncios; también permite publicarla. */
export function EditorLista({ lista, alGuardar, alPublicar }: Props) {
  const anuncios = useDatos(() => anunciosApi.listar())
  const accion = useAccion()
  const { esAdministrador } = useAuth()
  const [nombre, setNombre] = useState(lista.nombre)
  const [descripcion, setDescripcion] = useState(lista.descripcion ?? '')
  const [estaActiva, setEstaActiva] = useState(lista.estaActiva)
  const [elementos, setElementos] = useState<ElementoEditable[]>(() =>
    lista.elementos.map((e) => ({
      clave: e.id,
      anuncioId: e.anuncioId,
      titulo: e.tituloAnuncio,
      duracionPersonalizada: e.duracionPersonalizadaSegundos?.toString() ?? '',
    })),
  )
  // Claves negativas y decrecientes: no chocan con los ids del servidor (positivos).
  const claveNueva = useRef(-1)
  const [anuncioAgregar, setAnuncioAgregar] = useState('')
  const [modificado, setModificado] = useState(false)

  const duracionPredeterminada = (anuncioId: number) =>
    anuncios.datos?.find((a) => a.id === anuncioId)?.duracionPredeterminadaSegundos

  const editar = <T,>(establecer: (valor: T) => void) => (valor: T) => {
    establecer(valor)
    setModificado(true)
  }

  const cambiarElementos = editar(setElementos)

  const mover = (indice: number, desplazamiento: number) => {
    const destino = indice + desplazamiento
    if (destino < 0 || destino >= elementos.length) {
      return
    }
    const copia = [...elementos]
    ;[copia[indice], copia[destino]] = [copia[destino], copia[indice]]
    cambiarElementos(copia)
  }

  const agregar = () => {
    const anuncio = anuncios.datos?.find((a) => a.id === Number(anuncioAgregar))
    if (!anuncio) {
      return
    }
    cambiarElementos([
      ...elementos,
      { clave: claveNueva.current--, anuncioId: anuncio.id, titulo: anuncio.titulo, duracionPersonalizada: '' },
    ])
    setAnuncioAgregar('')
  }

  const guardar = async () => {
    const ok = await accion.ejecutar(() =>
      listasApi.actualizar(lista.id, {
        nombre,
        descripcion: descripcion || null,
        estaActiva,
        elementos: elementos.map((e) => ({
          anuncioId: e.anuncioId,
          duracionPersonalizadaSegundos: e.duracionPersonalizada ? Number(e.duracionPersonalizada) : null,
        })),
      }),
    )
    if (ok) {
      setModificado(false)
      await alGuardar()
    }
  }

  const publicar = async () => {
    if (await accion.ejecutar(() => listasApi.publicar(lista.id))) {
      await alPublicar()
    }
  }

  return (
    <section className="tarjeta">
      <h2>Editar lista</h2>
      <AvisoError mensaje={accion.error} />
      <div className="fila" style={{ marginBottom: 12 }}>
        <label className="campo">
          Nombre
          <input maxLength={LONGITUDES.nombre} value={nombre} onChange={(e) => editar(setNombre)(e.target.value)} />
        </label>
        <label className="campo" style={{ flex: 1 }}>
          Descripción
          <input maxLength={LONGITUDES.descripcion} value={descripcion} onChange={(e) => editar(setDescripcion)(e.target.value)} />
        </label>
        <label className="casilla">
          <input type="checkbox" checked={estaActiva} onChange={(e) => editar(setEstaActiva)(e.target.checked)} />
          Activa
        </label>
      </div>

      <table>
        <thead>
          <tr><th>#</th><th>Anuncio</th><th>Duración (s)</th><th></th></tr>
        </thead>
        <tbody>
          {elementos.map((e, i) => (
            <tr key={e.clave}>
              <td>{i + 1}</td>
              <td>{e.titulo}</td>
              <td>
                <input
                  type="number"
                  min={DURACION_SEGUNDOS.minima}
                  max={DURACION_SEGUNDOS.maxima}
                  style={{ width: 90 }}
                  placeholder={String(duracionPredeterminada(e.anuncioId) ?? '')}
                  value={e.duracionPersonalizada}
                  onChange={(ev) =>
                    cambiarElementos(elementos.map((x) => (x.clave === e.clave ? { ...x, duracionPersonalizada: ev.target.value } : x)))
                  }
                />
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="mini" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>{' '}
                <button className="mini" onClick={() => mover(i, 1)} disabled={i === elementos.length - 1} aria-label="Bajar">↓</button>{' '}
                <button className="mini peligro" onClick={() => cambiarElementos(elementos.filter((x) => x.clave !== e.clave))}>
                  Quitar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {elementos.length === 0 && <p className="suave">La lista está vacía.</p>}
      <p className="suave">Si la duración queda vacía se usa la predeterminada del anuncio.</p>

      <div className="fila" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <div className="fila">
          <select value={anuncioAgregar} onChange={(e) => setAnuncioAgregar(e.target.value)}>
            <option value="">Agregar anuncio…</option>
            {(anuncios.datos ?? []).filter((a) => a.estaActivo).map((a) => (
              <option key={a.id} value={a.id}>{a.titulo} ({a.tipoMultimedia})</option>
            ))}
          </select>
          <button onClick={agregar} disabled={!anuncioAgregar}>Agregar</button>
        </div>
        <div className="fila">
          <button className="primario" onClick={guardar} disabled={accion.ocupado || !modificado}>Guardar cambios</button>
          {esAdministrador && (
            <button
              onClick={publicar}
              disabled={accion.ocupado || modificado}
              title={modificado ? 'Guarde los cambios antes de publicar' : 'Crear una versión inmutable'}
            >
              Publicar versión
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
