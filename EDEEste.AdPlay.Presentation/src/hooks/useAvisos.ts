import { useContext } from 'react'
import { AvisosContexto, type Avisar } from '../context/avisosContexto'

export function useAvisos(): Avisar {
  const avisar = useContext(AvisosContexto)
  if (!avisar) {
    throw new Error('useAvisos debe usarse dentro de ProveedorAvisos.')
  }
  return avisar
}
