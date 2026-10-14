export function formatearFecha(utc: string | null | undefined): string {
  return utc ? new Date(utc).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

export function formatearFechaLarga(utc: string | null | undefined): string {
  return utc ? new Date(utc).toLocaleString('es-DO', { dateStyle: 'long', timeStyle: 'short' }) : '—'
}

export function formatearHora(utc: string | null | undefined): string {
  return utc ? new Date(utc).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' }) : '—'
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
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** «0:45», «12:05» o «1:02:03». */
export function formatearDuracion(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const resto = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${resto}` : `${m}:${resto}`
}

/** «hace 8 s», «hace 3 min», «hace 2 días»; «Nunca» si no hay fecha. */
export function hace(utc: string | null | undefined, ahora: number = Date.now()): string {
  if (!utc) {
    return 'Nunca'
  }
  const segundos = Math.max(0, Math.round((ahora - new Date(utc).getTime()) / 1000))
  if (segundos < 60) {
    return `hace ${segundos} s`
  }
  if (segundos < 3600) {
    return `hace ${Math.floor(segundos / 60)} min`
  }
  if (segundos < 86400) {
    return `hace ${Math.floor(segundos / 3600)} h`
  }
  const dias = Math.floor(segundos / 86400)
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}

export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`
}

/** Minúsculas y sin tildes, para buscar sin importar cómo se escriba. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function coincideBusqueda(termino: string, ...campos: (string | null | undefined)[]): boolean {
  const buscado = normalizar(termino.trim())
  return !buscado || normalizar(campos.filter(Boolean).join(' ')).includes(buscado)
}

/**
 * El identificador de versión de una publicación es «{publicación}.{número}»; la interfaz muestra «v{número}».
 * Si no tiene ese formato se muestra tal cual.
 */
export function versionCorta(identificador: string | null | undefined): string {
  if (!identificador) {
    return '—'
  }
  const numero = identificador.split('.')[1]
  return numero ? `v${numero}` : identificador
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

/** Inicio del día local de una fecha «AAAA-MM-DD» (input date), en ISO UTC. */
export function inicioDelDia(fecha: string): string | undefined {
  return fecha ? new Date(`${fecha}T00:00:00`).toISOString() : undefined
}

/** Fin del día local de una fecha «AAAA-MM-DD», en ISO UTC. */
export function finDelDia(fecha: string): string | undefined {
  return fecha ? new Date(`${fecha}T23:59:59.999`).toISOString() : undefined
}
