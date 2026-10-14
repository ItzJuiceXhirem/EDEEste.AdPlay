// Degradados de la paleta para los anuncios sin imagen que mostrar (vídeos, o mientras carga la imagen).
const DEGRADADOS: [string, string][] = [
  ['#FFB4A2', '#B5838D'],
  ['#FFCDB2', '#E5989B'],
  ['#E5989B', '#6D6875'],
  ['#B5838D', '#2D2730'],
  ['#A7C957', '#6D6875'],
  ['#FFCDB2', '#B5838D'],
]

/** Degradado estable para un anuncio (el mismo anuncio siempre tiene el mismo color). */
export function degradadoDe(semilla: number): string {
  const [a, b] = DEGRADADOS[Math.abs(semilla) % DEGRADADOS.length]
  return `linear-gradient(135deg, ${a}, ${b})`
}
