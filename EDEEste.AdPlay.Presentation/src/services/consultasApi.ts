import type {
  AccionAuditoria,
  EstadoPantallaReporte,
  HistorialExportacion,
  HistorialPublicacion,
  Pagina,
  RegistroAuditoria,
  ResumenAuditoria,
  ResumenHistorial,
} from '../types/api'
import { api, consulta } from './clienteApi'

export interface FiltroAuditoria {
  /** Fechas en ISO UTC. */
  desde?: string
  hasta?: string
  usuarioId?: number
  accion?: AccionAuditoria | ''
  tipoEntidad?: string
}

export interface FiltroHistorial {
  listaReproduccionId?: number
  desde?: string
  hasta?: string
}

interface Paginado {
  pagina?: number
  tamanoPagina?: number
}

export const auditoriaApi = {
  listar: (filtro: FiltroAuditoria & Paginado) =>
    api.get<Pagina<RegistroAuditoria>>(`/auditoria${consulta({ ...filtro })}`),
  resumen: (filtro: FiltroAuditoria) => api.get<ResumenAuditoria>(`/auditoria/resumen${consulta({ ...filtro })}`),
}

export const historialApi = {
  resumen: (filtro: FiltroHistorial) => api.get<ResumenHistorial>(`/historial/resumen${consulta({ ...filtro })}`),
  publicaciones: (filtro: FiltroHistorial & Paginado) =>
    api.get<Pagina<HistorialPublicacion>>(`/historial/publicaciones${consulta({ ...filtro })}`),
  exportaciones: (filtro: FiltroHistorial & Paginado) =>
    api.get<Pagina<HistorialExportacion>>(`/historial/exportaciones${consulta({ ...filtro })}`),
}

export const reportesApi = {
  estadoPantallas: () => api.get<EstadoPantallaReporte[]>('/reportes/estado-pantallas'),
}
