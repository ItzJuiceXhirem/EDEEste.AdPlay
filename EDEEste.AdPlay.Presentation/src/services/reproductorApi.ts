import type { Manifiesto } from '../types/api'
import { ErrorApi, urlApi } from './clienteApi'

const CABECERA_TOKEN = 'X-Token-Dispositivo'

export type ResultadoManifiesto =
  | { cambiado: false }
  | { cambiado: true; manifiesto: Manifiesto; etiqueta: string | null }

/** Consulta el manifiesto; si la etiqueta coincide, la API responde 304 y no se descarga de nuevo. */
export async function obtenerManifiesto(token: string, etiquetaActual: string | null): Promise<ResultadoManifiesto> {
  const cabeceras: Record<string, string> = { [CABECERA_TOKEN]: token }
  if (etiquetaActual) {
    cabeceras['If-None-Match'] = etiquetaActual
  }

  const respuesta = await fetch(urlApi('/reproductor/manifiesto'), { headers: cabeceras, cache: 'no-store' })
  if (respuesta.status === 304) {
    return { cambiado: false }
  }
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status)
  }

  return {
    cambiado: true,
    manifiesto: (await respuesta.json()) as Manifiesto,
    etiqueta: respuesta.headers.get('ETag'),
  }
}

export async function descargarMedio(token: string, archivoMultimediaId: number): Promise<Blob> {
  const respuesta = await fetch(urlApi(`/reproductor/medios/${archivoMultimediaId}`), {
    headers: { [CABECERA_TOKEN]: token },
  })
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status)
  }
  return respuesta.blob()
}

/** Anuncio que se está mostrando: posición en el manifiesto y segundo transcurrido desde que empezó. */
export interface ReproduccionActual {
  posicion: number
  anuncioId: number
  segundo: number
}

export async function enviarLatido(
  token: string,
  versionReportada: string | null,
  error: string | null,
  reproduccion: ReproduccionActual | null,
): Promise<void> {
  await fetch(urlApi('/reproductor/latido'), {
    method: 'POST',
    headers: { [CABECERA_TOKEN]: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionReportada, error, reproduccion }),
  })
}
