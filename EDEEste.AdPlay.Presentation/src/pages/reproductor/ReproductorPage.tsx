import { useEffect, useRef, useState } from 'react'
import { useSincronizacionReproductor } from '../../hooks/useSincronizacionReproductor'
import { guardarToken, leerToken } from '../../services/almacenReproductor'
import type { ElementoManifiesto } from '../../types/api'
import './reproductor.css'

/** Lee el token de ?token= una sola vez, lo guarda en el dispositivo y lo quita de la barra de direcciones. */
function resolverToken(): string | null {
  const parametros = new URLSearchParams(window.location.search)
  const delEnlace = parametros.get('token')
  if (!delEnlace) {
    return leerToken()
  }

  guardarToken(delEnlace)
  parametros.delete('token')
  const consulta = parametros.toString()
  window.history.replaceState(null, '', window.location.pathname + (consulta ? `?${consulta}` : ''))
  return delEnlace
}

export function ReproductorPage() {
  const [token] = useState(resolverToken)
  const { estado, reportarError, reportarReproduccion } = useSincronizacionReproductor(token)

  const pantallaCompleta = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
    }
  }

  return (
    <div className="reproductor" onClick={pantallaCompleta}>
      {estado.tipo === 'reproduciendo' && (
        <Carrusel
          key={estado.version}
          elementos={estado.elementos}
          urls={estado.urls}
          alError={reportarError}
          alMostrar={(posicion, anuncioId) => reportarReproduccion(estado.version, posicion, anuncioId)}
        />
      )}
      {estado.tipo === 'cargando' && <EsperaAnimada titulo="Cargando contenido…" />}
      {estado.tipo === 'sin-contenido' && (
        <EsperaAnimada titulo="No hay contenido disponible" detalle={estado.deshabilitada ? 'Pantalla deshabilitada' : undefined} />
      )}
      {estado.tipo === 'sin-token' && (
        <EsperaAnimada titulo="Pantalla sin configurar" detalle="Abra el enlace del reproductor generado en el panel de administración." />
      )}
      {estado.tipo === 'token-invalido' && (
        <EsperaAnimada titulo="Pantalla no autorizada" detalle="El token del dispositivo no es válido o fue revocado." />
      )}
    </div>
  )
}

interface PropsCarrusel {
  elementos: ElementoManifiesto[]
  urls: Record<number, string>
  alError: (mensaje: string) => void
  /** Se llama cada vez que empieza a mostrarse un anuncio. */
  alMostrar: (posicion: number, anuncioId: number) => void
}

/** Pausa antes de pasar al siguiente cuando un medio falla, para no entrar en un ciclo veloz de errores. */
const ESPERA_TRAS_ERROR_MS = 1000

function Carrusel({ elementos, urls, alError, alMostrar }: PropsCarrusel) {
  const [indice, setIndice] = useState(0)
  const [ciclo, setCiclo] = useState(0)
  const actual = elementos[indice]

  const mostrar = useRef(alMostrar)
  useEffect(() => {
    mostrar.current = alMostrar
  })
  useEffect(() => {
    mostrar.current(actual.posicion, actual.anuncioId)
  }, [ciclo, indice, actual.posicion, actual.anuncioId])

  const siguiente = () => {
    if (indice + 1 >= elementos.length) {
      setIndice(0)
      setCiclo((c) => c + 1)
    } else {
      setIndice(indice + 1)
    }
  }

  // Las imágenes avanzan por duración; los vídeos al terminar (duración real completa).
  useEffect(() => {
    if (actual.tipoMultimedia !== 'Imagen') {
      return
    }
    const temporizador = window.setTimeout(siguiente, actual.duracionSegundos * 1000)
    return () => window.clearTimeout(temporizador)
  })

  const url = urls[actual.archivoMultimediaId]
  const clave = `${ciclo}-${indice}`
  const alFallar = () => {
    alError(`No se pudo reproducir "${actual.titulo}" (${actual.nombreArchivo}).`)
    window.setTimeout(siguiente, ESPERA_TRAS_ERROR_MS)
  }

  return actual.tipoMultimedia === 'Imagen'
    ? <img key={clave} className="medio-reproductor" src={url} alt={actual.titulo} onError={alFallar} />
    : (
      <video key={clave} className="medio-reproductor" src={url} autoPlay muted playsInline
        onEnded={siguiente} onError={alFallar} />
    )
}

function EsperaAnimada({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="espera">
      <div className="espera-marca">
        <div className="espera-anillo" />
        <span>EDEEste</span>
      </div>
      <h1>{titulo}</h1>
      {detalle && <p>{detalle}</p>}
    </div>
  )
}
