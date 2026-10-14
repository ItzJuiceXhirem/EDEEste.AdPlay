import type { ElementoReproduccion, ReproduccionReportada } from '../types/api'

export interface ReproduccionEstimada {
  indice: number
  elemento: ElementoReproduccion
  /** Segundo dentro del anuncio actual. */
  segundo: number
  porcentaje: number
  /** Segundo dentro de la vuelta completa de la lista. */
  enCiclo: number
  duracionCiclo: number
}

/**
 * Estima qué anuncio muestra la pantalla ahora. Parte de lo que informó en su último latido y avanza por la lista
 * según las duraciones; el siguiente latido corrige cualquier desfase (por ejemplo, un vídeo que tardó en cargar).
 */
export function estimarReproduccion(
  elementos: ElementoReproduccion[],
  reportada: ReproduccionReportada | null,
  ahora: number,
): ReproduccionEstimada | null {
  if (!reportada || elementos.length === 0) {
    return null
  }
  const duraciones = elementos.map((e) => Math.max(0, e.duracionSegundos))
  const duracionCiclo = duraciones.reduce((t, d) => t + d, 0)
  if (duracionCiclo <= 0) {
    return null
  }

  let indiceReportado = elementos.findIndex((e) => e.posicion === reportada.posicion && e.anuncioId === reportada.anuncioId)
  if (indiceReportado < 0) {
    indiceReportado = elementos.findIndex((e) => e.posicion === reportada.posicion)
  }
  if (indiceReportado < 0) {
    return null
  }

  const inicioReportado = duraciones.slice(0, indiceReportado).reduce((t, d) => t + d, 0)
  const transcurrido = Math.max(0, (ahora - new Date(reportada.reportadaUtc).getTime()) / 1000)
  const enCiclo = (inicioReportado + Math.min(reportada.segundo, duraciones[indiceReportado]) + transcurrido) % duracionCiclo

  let resto = enCiclo
  let indice = 0
  while (indice < elementos.length - 1 && resto >= duraciones[indice]) {
    resto -= duraciones[indice]
    indice++
  }
  const duracion = duraciones[indice] || 1
  return {
    indice,
    elemento: elementos[indice],
    segundo: Math.floor(Math.min(resto, duracion)),
    porcentaje: Math.min(100, (resto / duracion) * 100),
    enCiclo: Math.floor(enCiclo),
    duracionCiclo,
  }
}
