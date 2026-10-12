import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { alExpirarSesion, guardarTokens, leerTokens, limpiarTokens } from '../services/almacenSesion'
import { sesionApi } from '../services/sesionApi'
import type { Sesion } from '../types/api'
import { ROLES } from '../constants/seguridad'
import { AuthContexto, type ValorAuth } from './authContexto'

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [cargando, setCargando] = useState(() => leerTokens() !== null)

  // Restaura la sesión guardada al abrir la aplicación (por ejemplo, tras recargar la página).
  useEffect(() => {
    if (!leerTokens()) {
      return
    }

    let vigente = true
    sesionApi
      .obtenerSesion()
      .then((actual) => vigente && setSesion(actual))
      .catch(() => vigente && setSesion(null))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [])

  // La API avisa cuando ya no se puede renovar la sesión.
  useEffect(() => alExpirarSesion(() => setSesion(null)), [])

  const iniciarSesion = useCallback(async (correo: string, clave: string) => {
    guardarTokens(await sesionApi.iniciarSesion(correo, clave))
    setSesion(await sesionApi.obtenerSesion())
  }, [])

  const cerrarSesion = useCallback(() => {
    limpiarTokens()
    setSesion(null)
  }, [])

  const valor = useMemo<ValorAuth>(
    () => ({
      sesion,
      cargando,
      esAdministrador: sesion?.rol === ROLES.administrador,
      iniciarSesion,
      cerrarSesion,
    }),
    [sesion, cargando, iniciarSesion, cerrarSesion],
  )

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>
}
