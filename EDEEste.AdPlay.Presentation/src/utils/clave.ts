// Requisitos de contraseña; coinciden con la configuración de Identity en la API (Infrastructure/InyeccionDependencias).
// La API los hace cumplir; aquí solo guían a la persona mientras escribe.

export const LONGITUD_MINIMA_CLAVE = 10

export interface Requisito {
  texto: string
  cumple: boolean
}

export function requisitosClave(clave: string): Requisito[] {
  return [
    { texto: `Al menos ${LONGITUD_MINIMA_CLAVE} caracteres`, cumple: clave.length >= LONGITUD_MINIMA_CLAVE },
    { texto: 'Una letra mayúscula', cumple: /\p{Lu}/u.test(clave) },
    { texto: 'Una letra minúscula', cumple: /\p{Ll}/u.test(clave) },
    { texto: 'Un número', cumple: /\d/.test(clave) },
  ]
}

export const TEXTO_FORTALEZA = ['Sin empezar', 'Débil', 'Regular', 'Casi lista', 'Cumple los requisitos']

export function esCorreoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
}

/** Contraseña aleatoria que cumple los requisitos (para restablecer la de otra persona). */
export function generarClave(longitud = 14): string {
  const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const minusculas = 'abcdefghijkmnopqrstuvwxyz'
  const numeros = '23456789'
  const todos = mayusculas + minusculas + numeros
  const azar = (max: number) => {
    const valor = new Uint32Array(1)
    crypto.getRandomValues(valor)
    return valor[0] % max
  }
  const elegir = (conjunto: string) => conjunto[azar(conjunto.length)]
  const caracteres = [elegir(mayusculas), elegir(minusculas), elegir(numeros)]
  while (caracteres.length < longitud) {
    caracteres.push(elegir(todos))
  }
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = azar(i + 1)
    ;[caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]]
  }
  return caracteres.join('')
}
