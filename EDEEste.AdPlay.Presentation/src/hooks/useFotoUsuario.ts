import { useEffect, useState } from 'react'
import { solicitarArchivo } from '../services/clienteApi'
import { usuariosApi } from '../services/sesionApi'

// La foto requiere sesión, así que se descarga como blob. Se comparte entre componentes (barra superior, tabla de
// usuarios, auditoría…) y cada versión se pide una sola vez: una foto nueva trae otra versión y por tanto otra clave.
const cache = new Map<string, Promise<string>>()

function cargar(clave: string, usuarioId: number, version: string): Promise<string> {
  let promesa = cache.get(clave)
  if (!promesa) {
    promesa = solicitarArchivo(usuariosApi.rutaFoto(usuarioId, version)).then(({ blob }) => URL.createObjectURL(blob))
    // Un fallo (red, foto borrada) no se queda en caché: se reintenta la próxima vez.
    promesa.catch(() => cache.delete(clave))
    cache.set(clave, promesa)
  }
  return promesa
}

/** URL local de la foto de perfil, o null mientras carga, si falla o si no tiene foto. */
export function useFotoUsuario(usuarioId: number | null | undefined, version: string | null | undefined): string | null {
  const clave = usuarioId != null && version ? `${usuarioId}:${version}` : null
  const [cargada, setCargada] = useState<{ clave: string; url: string } | null>(null)

  useEffect(() => {
    if (!clave || usuarioId == null || !version) {
      return
    }
    let vigente = true
    cargar(clave, usuarioId, version).then(
      (url) => vigente && setCargada({ clave, url }),
      () => undefined,
    )
    return () => {
      vigente = false
    }
  }, [clave, usuarioId, version])

  return cargada && cargada.clave === clave ? cargada.url : null
}

/** Iniciales para el avatar sin foto: primera letra del nombre y del primer apellido. */
export function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) {
    return '?'
  }
  const primera = partes[0][0]
  const segunda = partes.length > 1 ? partes[1][0] : ''
  return (primera + segunda).toLocaleUpperCase('es')
}
