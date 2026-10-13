import { useContext } from 'react'
import { AuthContexto, type ValorAuth } from '../context/authContexto'

export function useAuth(): ValorAuth {
  const valor = useContext(AuthContexto)
  if (!valor) {
    throw new Error('useAuth debe usarse dentro de ProveedorAuth.')
  }
  return valor
}
