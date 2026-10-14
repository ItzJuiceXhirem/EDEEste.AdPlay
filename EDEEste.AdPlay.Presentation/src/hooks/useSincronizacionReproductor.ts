import { useCallback, useEffect, useRef, useState } from 'react'
import { guardarManifiesto, leerManifiesto, obtenerMedio } from '../services/almacenReproductor'
import { ErrorApi } from '../services/clienteApi'
import { enviarLatido, obtenerManifiesto } from '../services/reproductorApi'
import type { ElementoManifiesto, Manifiesto } from '../types/api'

const INTERVALO_PREDETERMINADO_S = 30

/** Margen para que React pinte la versión nueva antes de liberar las URL de la anterior. */
const LIBERAR_URLS_DESPUES_MS = 5000

export type EstadoReproductor =
  | { tipo: 'cargando' }
  | { tipo: 'sin-token' }
  | { tipo: 'token-invalido' }
  | { tipo: 'sin-contenido'; deshabilitada: boolean }
  | { tipo: 'reproduciendo'; version: string; elementos: ElementoManifiesto[]; urls: Record<number, string> }

/**
 * Motor del reproductor web: consulta el manifiesto periódicamente (con ETag), descarga solo los medios que faltan,
 * verifica su hash y cambia de versión de forma completa para no dejar la pantalla en blanco.
 * Si se pierde la conexión, sigue reproduciendo la última versión válida.
 */
export function useSincronizacionReproductor(token: string | null) {
  const [estado, setEstado] = useState<EstadoReproductor>(() => (token ? { tipo: 'cargando' } : { tipo: 'sin-token' }))
  const urlsActivas = useRef<Record<number, string>>({})

  // Error de reproducción (por ejemplo, un vídeo que no decodifica): se informa en los latidos hasta que cambie la versión.
  const errorReproduccion = useRef<string | null>(null)
  const reportarError = useCallback((mensaje: string) => {
    errorReproduccion.current = mensaje
  }, [])

  // Anuncio en pantalla y cuándo empezó; el latido informa el segundo para que el panel muestre el avance.
  const enPantalla = useRef<{ version: string; posicion: number; anuncioId: number; inicio: number } | null>(null)
  const reportarReproduccion = useCallback((version: string, posicion: number, anuncioId: number) => {
    enPantalla.current = { version, posicion, anuncioId, inicio: performance.now() }
  }, [])

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelado = false
    let temporizador: number | undefined
    let etiqueta: string | null = null
    let versionActiva: string | null = null
    let ultimoError: string | null = null
    let intervaloS = INTERVALO_PREDETERMINADO_S

    const reemplazarUrls = (nuevas: Record<number, string>) => {
      const anteriores = urlsActivas.current
      urlsActivas.current = nuevas
      window.setTimeout(() => Object.values(anteriores).forEach(URL.revokeObjectURL), LIBERAR_URLS_DESPUES_MS)
    }

    const activar = async (manifiesto: Manifiesto, permitirDescarga: boolean) => {
      intervaloS = manifiesto.intervaloConsultaSegundos || INTERVALO_PREDETERMINADO_S

      if (!manifiesto.habilitada || !manifiesto.version || manifiesto.elementos.length === 0) {
        versionActiva = manifiesto.version
        reemplazarUrls({})
        setEstado({ tipo: 'sin-contenido', deshabilitada: !manifiesto.habilitada })
        return
      }
      if (manifiesto.version === versionActiva) {
        return
      }

      // Se preparan todos los medios antes de cambiar; si alguno falla se mantiene la versión anterior.
      const urls: Record<number, string> = {}
      for (const elemento of manifiesto.elementos) {
        if (!urls[elemento.archivoMultimediaId]) {
          const blob = await obtenerMedio(token, elemento, permitirDescarga)
          urls[elemento.archivoMultimediaId] = URL.createObjectURL(blob)
        }
      }
      if (cancelado) {
        Object.values(urls).forEach(URL.revokeObjectURL)
        return
      }

      versionActiva = manifiesto.version
      errorReproduccion.current = null
      reemplazarUrls(urls)
      setEstado({ tipo: 'reproduciendo', version: manifiesto.version, elementos: manifiesto.elementos, urls })
    }

    const sincronizar = async () => {
      try {
        const resultado = await obtenerManifiesto(token, etiqueta)
        if (resultado.cambiado) {
          await activar(resultado.manifiesto, true)
          etiqueta = resultado.etiqueta
          guardarManifiesto(resultado.manifiesto)
        }
        ultimoError = null
      } catch (e) {
        if (e instanceof ErrorApi && e.estado === 401) {
          versionActiva = null
          reemplazarUrls({})
          setEstado({ tipo: 'token-invalido' })
        }
        ultimoError = e instanceof Error ? e.message : String(e)
      }

      try {
        const actual = enPantalla.current
        const reproduccion =
          actual && actual.version === versionActiva
            ? { posicion: actual.posicion, anuncioId: actual.anuncioId, segundo: Math.floor((performance.now() - actual.inicio) / 1000) }
            : null
        await enviarLatido(token, versionActiva, ultimoError ?? errorReproduccion.current, reproduccion)
      } catch {
        // Sin conexión: se reintenta en el siguiente ciclo.
      }

      if (!cancelado) {
        temporizador = window.setTimeout(sincronizar, intervaloS * 1000)
      }
    }

    const iniciar = async () => {
      // Arranque sin conexión: usar el último manifiesto válido y los medios en caché.
      const guardado = leerManifiesto()
      if (guardado) {
        try {
          await activar(guardado, false)
        } catch {
          versionActiva = null
        }
      }
      await sincronizar()
    }

    void iniciar()

    return () => {
      cancelado = true
      window.clearTimeout(temporizador)
    }
  }, [token])

  return { estado, reportarError, reportarReproduccion }
}
