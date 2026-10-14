import type { ProblemDetails, RespuestaTokens } from '../types/api'
import { guardarTokens, leerTokens, notificarSesionExpirada } from './almacenSesion'

// URL pública de la API por ambiente (ver .env.development y .env.example).
// No poner secretos en variables VITE_*: terminan en el navegador.
const urlConfigurada = import.meta.env.VITE_API_BASE_URL
if (!urlConfigurada) {
  throw new Error('Falta VITE_API_BASE_URL. Defínala en .env.local o en las variables del ambiente de compilación.')
}

export const URL_BASE_API = urlConfigurada.replace(/\/$/, '')

export class ErrorApi extends Error {
  readonly estado: number
  readonly problema?: ProblemDetails

  constructor(estado: number, problema?: ProblemDetails) {
    super(describirProblema(estado, problema))
    this.name = 'ErrorApi'
    this.estado = estado
    this.problema = problema
  }
}

function describirProblema(estado: number, problema?: ProblemDetails): string {
  if (estado === 403) {
    return 'No tiene permiso para realizar esta acción.'
  }
  if (estado === 429) {
    return 'Demasiados intentos. Espere un momento e intente de nuevo.'
  }
  if (!problema) {
    return `Error ${estado} al comunicarse con el servidor.`
  }

  const errores = problema.errors ? Object.values(problema.errors).flat() : []
  const partes = [problema.detail ?? problema.title, ...errores].filter(Boolean)
  const mensaje = partes.length > 0 ? partes.join(' ') : `Error ${estado}.`
  return problema.traceId && estado >= 500 ? `${mensaje} (Ref.: ${problema.traceId})` : mensaje
}

export function urlApi(ruta: string): string {
  return `${URL_BASE_API}/api${ruta}`
}

interface OpcionesSolicitud extends RequestInit {
  /** Falso en los endpoints anónimos (inicio de sesión y renovación). */
  conSesion?: boolean
}

// Una sola renovación a la vez: si varias peticiones reciben 401 juntas, comparten el mismo intento.
let renovacionEnCurso: Promise<boolean> | null = null

async function renovarSesion(): Promise<boolean> {
  const tokens = leerTokens()
  if (!tokens) {
    return false
  }

  renovacionEnCurso ??= (async () => {
    try {
      const respuesta = await fetch(urlApi('/auth/renovar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renovarToken: tokens.refreshToken }),
      })
      if (!respuesta.ok) {
        return false
      }
      guardarTokens((await respuesta.json()) as RespuestaTokens)
      return true
    } catch {
      return false
    } finally {
      renovacionEnCurso = null
    }
  })()

  return renovacionEnCurso
}

function construirCabeceras(init: OpcionesSolicitud): Headers {
  const cabeceras = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !cabeceras.has('Content-Type')) {
    cabeceras.set('Content-Type', 'application/json')
  }
  const tokens = init.conSesion === false ? null : leerTokens()
  if (tokens) {
    cabeceras.set('Authorization', `Bearer ${tokens.accessToken}`)
  }
  return cabeceras
}

/** Envía la petición con la sesión; si el token venció lo renueva y reintenta una vez. */
async function enviar(ruta: string, init: OpcionesSolicitud): Promise<Response> {
  const intentar = async () => {
    try {
      return await fetch(urlApi(ruta), { ...init, headers: construirCabeceras(init) })
    } catch {
      // fetch solo rechaza ante fallos de red (servidor caído, sin conexión, CORS).
      throw new ErrorApi(0, {
        detail: `No se pudo conectar con el servidor (${URL_BASE_API}). Verifique que la API esté en ejecución e intente de nuevo.`,
      })
    }
  }

  let respuesta = await intentar()
  if (respuesta.status === 401 && init.conSesion !== false && leerTokens()) {
    if (await renovarSesion()) {
      respuesta = await intentar()
    }
    if (respuesta.status === 401) {
      notificarSesionExpirada()
    }
  }
  return respuesta
}

async function leerProblema(respuesta: Response): Promise<ProblemDetails | undefined> {
  try {
    return (await respuesta.json()) as ProblemDetails
  } catch {
    return undefined
  }
}

export async function solicitar<T>(ruta: string, init: OpcionesSolicitud = {}): Promise<T> {
  const respuesta = await enviar(ruta, init)
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await leerProblema(respuesta))
  }

  if (respuesta.status === 204) {
    return undefined as T
  }

  return (await respuesta.json()) as T
}

/** Descarga un recurso binario autenticado (los enlaces directos no pueden llevar el token de sesión). */
export async function solicitarArchivo(ruta: string): Promise<{ blob: Blob; nombre: string | null }> {
  const respuesta = await enviar(ruta, {})
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await leerProblema(respuesta))
  }

  const disposicion = respuesta.headers.get('Content-Disposition') ?? ''
  const coincidencia = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposicion)
  return { blob: await respuesta.blob(), nombre: coincidencia ? decodeURIComponent(coincidencia[1]) : null }
}

function problemaDeTexto(texto: string): ProblemDetails | undefined {
  try {
    return JSON.parse(texto) as ProblemDetails
  } catch {
    return undefined
  }
}

/**
 * Envía un formulario informando el avance de la subida (fetch no lo permite; XMLHttpRequest sí).
 * alEnviado se llama cuando el archivo terminó de subir y el servidor empieza a validarlo.
 */
export async function subirConProgreso<T>(
  ruta: string,
  formulario: FormData,
  alProgreso: (fraccion: number) => void,
  alEnviado?: () => void,
): Promise<T> {
  const intentar = () =>
    new Promise<{ estado: number; cuerpo: string }>((resolver, rechazar) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', urlApi(ruta))
      const tokens = leerTokens()
      if (tokens) {
        xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`)
      }
      xhr.upload.onprogress = (e) => e.lengthComputable && alProgreso(e.loaded / e.total)
      xhr.upload.onload = () => alEnviado?.()
      xhr.onload = () => resolver({ estado: xhr.status, cuerpo: xhr.responseText })
      xhr.onerror = () =>
        rechazar(
          new ErrorApi(0, {
            detail: `No se pudo conectar con el servidor (${URL_BASE_API}). Verifique la conexión e intente de nuevo.`,
          }),
        )
      xhr.send(formulario)
    })

  let respuesta = await intentar()
  if (respuesta.estado === 401 && leerTokens()) {
    if (await renovarSesion()) {
      alProgreso(0)
      respuesta = await intentar()
    }
    if (respuesta.estado === 401) {
      notificarSesionExpirada()
    }
  }
  if (respuesta.estado < 200 || respuesta.estado >= 300) {
    throw new ErrorApi(respuesta.estado, problemaDeTexto(respuesta.cuerpo))
  }
  return JSON.parse(respuesta.cuerpo) as T
}

export const api = {
  get: <T>(ruta: string, opciones: OpcionesSolicitud = {}) => solicitar<T>(ruta, opciones),
  post: <T>(ruta: string, cuerpo?: unknown, opciones: OpcionesSolicitud = {}) =>
    solicitar<T>(ruta, {
      ...opciones,
      method: 'POST',
      body: cuerpo instanceof FormData ? cuerpo : cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    }),
  put: <T>(ruta: string, cuerpo: unknown) => solicitar<T>(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) }),
  patch: <T>(ruta: string, cuerpo: unknown) => solicitar<T>(ruta, { method: 'PATCH', body: JSON.stringify(cuerpo) }),
  delete: (ruta: string) => solicitar<void>(ruta, { method: 'DELETE' }),
}

export function consulta(parametros: Record<string, string | number | boolean | null | undefined>): string {
  const valores = Object.entries(parametros).filter(([, v]) => v !== null && v !== undefined && v !== '')
  return valores.length === 0 ? '' : `?${new URLSearchParams(valores.map(([k, v]) => [k, String(v)])).toString()}`
}
