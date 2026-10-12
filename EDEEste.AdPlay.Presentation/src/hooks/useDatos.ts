import { useCallback, useEffect, useRef, useState } from 'react'

interface EstadoDatos<T> {
  datos: T | undefined
  error: string | null
  cargando: boolean
}

function mensajeDe(e: unknown): string {
  return e instanceof Error ? e.message : 'Error desconocido.'
}

/**
 * Carga datos de la API cuando cambian las dependencias y expone estado de carga, error y una función para recargar.
 */
export function useDatos<T>(cargar: () => Promise<T>, dependencias: readonly unknown[] = []) {
  const [estado, setEstado] = useState<EstadoDatos<T>>({ datos: undefined, error: null, cargando: true })
  const cargarActual = useRef(cargar)

  useEffect(() => {
    cargarActual.current = cargar
  })

  const clave = JSON.stringify(dependencias)
  useEffect(() => {
    let vigente = true
    cargarActual.current().then(
      (datos) => vigente && setEstado({ datos, error: null, cargando: false }),
      (e: unknown) => vigente && setEstado((previo) => ({ ...previo, error: mensajeDe(e), cargando: false })),
    )
    return () => {
      vigente = false
    }
  }, [clave])

  const recargar = useCallback(async () => {
    try {
      const datos = await cargarActual.current()
      setEstado({ datos, error: null, cargando: false })
    } catch (e) {
      setEstado((previo) => ({ ...previo, error: mensajeDe(e), cargando: false }))
    }
  }, [])

  return { ...estado, recargar }
}

/** Ejecuta una acción mostrando su error; devuelve true si terminó bien. */
export function useAccion() {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const ejecutar = useCallback(async (accion: () => Promise<unknown>) => {
    setOcupado(true)
    setError(null)
    try {
      await accion()
      return true
    } catch (e) {
      setError(mensajeDe(e))
      return false
    } finally {
      setOcupado(false)
    }
  }, [])

  return { error, ocupado, ejecutar }
}
