import { useEffect, useState } from 'react'

/**
 * Avance de 0 a 1 (con desaceleración) durante la entrada de una página, para que los números y gráficos «crezcan».
 * Vuelve a empezar cuando cambia la clave (por ejemplo, al llegar los datos).
 */
export function useProgresoEntrada(clave: unknown = null, duracionMs = 1100): number {
  const [progreso, setProgreso] = useState(0)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const cuadro = requestAnimationFrame(() => setProgreso(1))
      return () => cancelAnimationFrame(cuadro)
    }
    const inicio = performance.now()
    let cuadro = 0
    const animar = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracionMs)
      setProgreso(1 - Math.pow(1 - t, 3))
      if (t < 1) {
        cuadro = requestAnimationFrame(animar)
      }
    }
    cuadro = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(cuadro)
  }, [clave, duracionMs])

  return progreso
}

/** Hora actual que se actualiza cada intervalo (para «hace 8 s» y avances estimados). */
export function useAhora(intervaloMs = 1000): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(Date.now()), intervaloMs)
    return () => window.clearInterval(reloj)
  }, [intervaloMs])
  return ahora
}
