import { descargarMedio } from './reproductorApi'
import type { ElementoManifiesto, Manifiesto } from '../types/api'

// Persistencia local del reproductor: permite seguir reproduciendo la última versión válida sin conexión.

const CLAVE_MANIFIESTO = 'adplay.manifiesto'
const CLAVE_TOKEN = 'adplay.token'
const NOMBRE_CACHE = 'adplay-medios'

export function guardarToken(token: string): void {
  try {
    localStorage.setItem(CLAVE_TOKEN, token)
  } catch {
    // Sin almacenamiento: el token solo vale mientras la pestaña siga abierta.
  }
}

export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

export function guardarManifiesto(manifiesto: Manifiesto): void {
  try {
    localStorage.setItem(CLAVE_MANIFIESTO, JSON.stringify(manifiesto))
  } catch {
    // Almacenamiento no disponible: solo se pierde el arranque sin conexión.
  }
}

export function leerManifiesto(): Manifiesto | null {
  try {
    const texto = localStorage.getItem(CLAVE_MANIFIESTO)
    return texto ? (JSON.parse(texto) as Manifiesto) : null
  } catch {
    return null
  }
}

/**
 * Devuelve el medio desde la caché local o, si se permite, lo descarga, verifica su hash y lo guarda.
 * Los medios se identifican por su hash, así un archivo nuevo nunca se confunde con uno anterior.
 */
export async function obtenerMedio(token: string, elemento: ElementoManifiesto, permitirDescarga: boolean): Promise<Blob> {
  const cache = await abrirCache()
  const clave = `${window.location.origin}/__adplay/medios/${elemento.hashSha256}`
  const enCache = await cache?.match(clave)
  if (enCache) {
    return enCache.blob()
  }
  if (!permitirDescarga) {
    throw new Error('Medio no disponible sin conexión.')
  }

  const blob = await descargarMedio(token, elemento.archivoMultimediaId)
  const hash = await calcularSha256(blob)
  if (hash !== null && hash !== elemento.hashSha256.toLowerCase()) {
    throw new Error(`El medio ${elemento.nombreArchivo} no coincide con su hash.`)
  }
  await cache?.put(clave, new Response(blob, { headers: { 'Content-Type': elemento.tipoMime } }))
  return blob
}

/** Cache Storage solo existe en contextos seguros (HTTPS o localhost). */
async function abrirCache(): Promise<Cache | null> {
  try {
    return 'caches' in window ? await caches.open(NOMBRE_CACHE) : null
  } catch {
    return null
  }
}

/** Web Crypto solo existe en contextos seguros; sin él no se puede verificar y se devuelve null. */
async function calcularSha256(blob: Blob): Promise<string | null> {
  if (!window.crypto?.subtle) {
    return null
  }
  const digest = await window.crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
