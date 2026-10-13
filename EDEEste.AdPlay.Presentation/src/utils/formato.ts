export function formatearFecha(utc: string | null | undefined): string {
  return utc ? new Date(utc).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

export function formatearTamano(bytes: number | null | undefined): string {
  if (bytes == null) {
    return '—'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Convierte el valor de un input datetime-local (hora local) a ISO UTC, o null si está vacío. */
export function localAUtc(valor: string): string | null {
  return valor ? new Date(valor).toISOString() : null
}

/** Convierte una fecha UTC al formato de un input datetime-local (hora local), o vacío si no hay fecha. */
export function utcALocal(utc: string | null): string {
  if (!utc) {
    return ''
  }
  const fecha = new Date(utc)
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
