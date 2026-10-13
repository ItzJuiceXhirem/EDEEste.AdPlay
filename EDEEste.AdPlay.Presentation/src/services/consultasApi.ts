import type {
  AccionAuditoria,
  EstadoPantallaReporte,
  HistorialExportacion,
  HistorialPublicacion,
  Pagina,
  RegistroAuditoria,
} from '../types/api'
import { api, consulta } from './clienteApi'

export interface FiltroAuditoria {
  desde?: string
  hasta?: string
  usuarioId?: number
  accion?: AccionAuditoria | ''
  tipoEntidad?: string
  pagina?: number
}

export interface FiltroHistorial {
  listaReproduccionId?: number
  pagina?: number
}

export const auditoriaApi = {
  listar: (filtro: FiltroAuditoria) => api.get<Pagina<RegistroAuditoria>>(`/auditoria${consulta({ ...filtro })}`),
}

export const historialApi = {
  publicaciones: (filtro: FiltroHistorial) =>
    api.get<Pagina<HistorialPublicacion>>(`/historial/publicaciones${consulta({ ...filtro })}`),
  exportaciones: (filtro: FiltroHistorial) =>
    api.get<Pagina<HistorialExportacion>>(`/historial/exportaciones${consulta({ ...filtro })}`),
}

export const reportesApi = {
  estadoPantallas: () => api.get<EstadoPantallaReporte[]>('/reportes/estado-pantallas'),
}
