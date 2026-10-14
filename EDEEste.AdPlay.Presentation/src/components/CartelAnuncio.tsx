import type { CSSProperties } from 'react'
import { useMedio } from '../hooks/useMedio'
import type { TipoMultimedia } from '../types/api'
import { degradadoDe } from '../utils/carteles'

interface Props {
  anuncioId: number
  archivoId: number
  tipo: TipoMultimedia
  className: string
  style?: CSSProperties
}

/**
 * Fondo que representa un anuncio: la imagen misma si es una imagen; un degradado de la paleta si es un vídeo
 * (descargarlo completo solo para un cuadro sería demasiado pesado).
 */
export function CartelAnuncio({ anuncioId, archivoId, tipo, className, style }: Props) {
  const { url } = useMedio(archivoId, tipo === 'Imagen')
  return (
    <div className={className} aria-hidden="true" style={{ background: degradadoDe(anuncioId), ...style }}>
      {url && <img src={url} alt="" />}
    </div>
  )
}
