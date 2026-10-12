import { useEffect, useRef, useState } from 'react'
import { solicitarArchivo } from '../services/clienteApi'
import type { TipoMultimedia } from '../types/api'

interface Props {
  /** Ruta de la API del contenido (el recurso requiere sesión, por eso no se usa un enlace directo). */
  ruta: string
  tipo: TipoMultimedia
  alternativo: string
}

/**
 * Muestra un medio protegido. Las imágenes se cargan al hacerse visibles; los vídeos, solo cuando el usuario lo
 * pide, porque pueden pesar cientos de megabytes.
 */
export function VistaPreviaMedio({ ruta, tipo, alternativo }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [solicitado, setSolicitado] = useState(tipo === 'Imagen')
  const [url, setUrl] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    const elemento = contenedor.current
    if (!elemento || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observador = new IntersectionObserver(([entrada]) => entrada.isIntersecting && setVisible(true))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  const cargar = visible && solicitado
  useEffect(() => {
    if (!cargar) {
      return
    }

    let vigente = true
    let urlCreada: string | null = null
    solicitarArchivo(ruta)
      .then(({ blob }) => {
        if (!vigente) {
          return
        }
        urlCreada = URL.createObjectURL(blob)
        setUrl(urlCreada)
      })
      .catch(() => vigente && setFallo(true))
    return () => {
      vigente = false
      if (urlCreada) {
        URL.revokeObjectURL(urlCreada)
      }
    }
  }, [cargar, ruta])

  return (
    <div className="vista" ref={contenedor}>
      {fallo && <span className="suave" style={{ color: '#fff' }}>No se pudo cargar</span>}
      {!fallo && url && tipo === 'Imagen' && <img src={url} alt={alternativo} />}
      {!fallo && url && tipo === 'Video' && <video src={url} controls muted />}
      {!fallo && !url && tipo === 'Video' && !solicitado && (
        <button className="mini" onClick={() => setSolicitado(true)}>▶ Ver vídeo</button>
      )}
      {!fallo && !url && solicitado && <span className="suave" style={{ color: '#fff' }}>Cargando…</span>}
    </div>
  )
}
