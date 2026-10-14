import type { CSSProperties } from 'react'
import { iniciales, useFotoUsuario } from '../hooks/useFotoUsuario'

interface Props {
  usuarioId: number | null | undefined
  nombre: string | null | undefined
  fotoVersion: string | null | undefined
  /** Clase de la forma: «avatar» (44 px, barra superior) o «iniciales» (tablas). */
  className?: string
  style?: CSSProperties
}

/** Foto de perfil o, si no tiene (o mientras carga), sus iniciales sobre el degradado. */
export function Avatar({ usuarioId, nombre, fotoVersion, className = 'iniciales', style }: Props) {
  const foto = useFotoUsuario(usuarioId, fotoVersion)
  return (
    <span className={className} style={style} aria-hidden="true">
      {foto ? <img src={foto} alt="" /> : iniciales(nombre)}
    </span>
  )
}
