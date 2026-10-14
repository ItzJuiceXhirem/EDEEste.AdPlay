import { useSyncExternalStore } from 'react'
import { fijarTema, leerTema, suscribirTema } from '../services/almacenTema'

export function useTema() {
  const tema = useSyncExternalStore(suscribirTema, leerTema)
  return { tema, oscuro: tema === 'oscuro', fijarTema }
}
