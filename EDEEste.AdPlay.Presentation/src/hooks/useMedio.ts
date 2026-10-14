import { useEffect, useState } from 'react'
import { solicitarArchivo } from '../services/clienteApi'
import { multimediaApi } from '../services/adminApi'

// El contenido multimedia requiere sesión, así que se descarga como blob. Los archivos son inmutables (cambiar el
// archivo crea otro registro), por eso cada uno se descarga una sola vez y se comparte entre las vistas.
const cache = new Map<number, Promise<string>>()

export function cargarMedio(archivoId: number): Promise<string> {
  let promesa = cache.get(archivoId)
  if (!promesa) {
    promesa = solicitarArchivo(multimediaApi.rutaContenido(archivoId)).then(({ blob }) => URL.createObjectURL(blob))
    promesa.catch(() => cache.delete(archivoId))
    cache.set(archivoId, promesa)
  }
  return promesa
}

interface EstadoMedio {
  url: string | null
  fallo: boolean
}

/** URL local del archivo, o null mientras carga o si no se pidió (activo = false). */
export function useMedio(archivoId: number | null | undefined, activo = true): EstadoMedio {
  const [cargado, setCargado] = useState<{ id: number; url: string | null; fallo: boolean } | null>(null)

  useEffect(() => {
    if (archivoId == null || !activo) {
      return
    }
    let vigente = true
    cargarMedio(archivoId).then(
      (url) => vigente && setCargado({ id: archivoId, url, fallo: false }),
      () => vigente && setCargado({ id: archivoId, url: null, fallo: true }),
    )
    return () => {
      vigente = false
    }
  }, [archivoId, activo])

  return cargado && cargado.id === archivoId ? { url: cargado.url, fallo: cargado.fallo } : { url: null, fallo: false }
}
