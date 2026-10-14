// Tema de la interfaz (claro u oscuro). Se guarda en el navegador y se aplica como clase en <html>, así también lo
// heredan los diálogos y avisos. index.html lo aplica antes de cargar React para que no parpadee al abrir.

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'adplay-tema'
const oyentes = new Set<() => void>()

function esTema(valor: unknown): valor is Tema {
  return valor === 'claro' || valor === 'oscuro'
}

function leerGuardado(): Tema | null {
  try {
    const valor = window.localStorage.getItem(CLAVE)
    return esTema(valor) ? valor : null
  } catch {
    return null
  }
}

function preferenciaDelSistema(): Tema {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

let actual: Tema = leerGuardado() ?? preferenciaDelSistema()

function aplicar(tema: Tema) {
  const raiz = document.documentElement
  raiz.classList.remove('claro', 'oscuro')
  raiz.classList.add(tema)
  raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light'
}

function cambiar(tema: Tema) {
  if (tema === actual) {
    return
  }
  actual = tema
  aplicar(tema)
  oyentes.forEach((oyente) => oyente())
}

aplicar(actual)

// Otra pestaña cambió el tema: se sigue aquí también.
window.addEventListener('storage', (e) => {
  if (e.key === CLAVE && esTema(e.newValue)) {
    cambiar(e.newValue)
  }
})

export function leerTema(): Tema {
  return actual
}

export function fijarTema(tema: Tema): void {
  try {
    window.localStorage.setItem(CLAVE, tema)
  } catch {
    // Sin almacenamiento (modo privado estricto): el tema dura lo que dure la pestaña.
  }
  cambiar(tema)
}

export function suscribirTema(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}
