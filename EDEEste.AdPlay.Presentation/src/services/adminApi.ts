import type {
  ActualizarPantalla,
  Anuncio,
  ArchivoMultimedia,
  AsignacionLista,
  Exportacion,
  GrupoPantalla,
  GuardarAnuncio,
  GuardarAsignacion,
  GuardarGrupoPantalla,
  GuardarListaReproduccion,
  GuardarSucursal,
  ListaReproduccion,
  ListaReproduccionResumen,
  Pantalla,
  PublicacionLista,
  RegistrarPantalla,
  Sucursal,
  TokenDispositivo,
} from '../types/api'
import { api, consulta, subirConProgreso } from './clienteApi'

export const sucursalesApi = {
  listar: () => api.get<Sucursal[]>('/sucursales'),
  crear: (dto: GuardarSucursal) => api.post<Sucursal>('/sucursales', dto),
  actualizar: (id: number, dto: GuardarSucursal) => api.put<Sucursal>(`/sucursales/${id}`, dto),
}

export const gruposPantallasApi = {
  listar: (sucursalId?: number) => api.get<GrupoPantalla[]>(`/grupos-pantallas${consulta({ sucursalId })}`),
  crear: (dto: GuardarGrupoPantalla) => api.post<GrupoPantalla>('/grupos-pantallas', dto),
  actualizar: (id: number, dto: GuardarGrupoPantalla) => api.put<GrupoPantalla>(`/grupos-pantallas/${id}`, dto),
}

export const pantallasApi = {
  listar: (filtro: { sucursalId?: number; grupoPantallaId?: number } = {}) =>
    api.get<Pantalla[]>(`/pantallas${consulta(filtro)}`),
  registrar: (dto: RegistrarPantalla) => api.post<Pantalla>('/pantallas', dto),
  actualizar: (id: number, dto: ActualizarPantalla) => api.patch<Pantalla>(`/pantallas/${id}`, dto),
  generarToken: (id: number) => api.post<TokenDispositivo>(`/pantallas/${id}/token`),
  revocarToken: (id: number) => api.delete(`/pantallas/${id}/token`),
}

export const multimediaApi = {
  listar: (incluirArchivados = false) => api.get<ArchivoMultimedia[]>(`/multimedia${consulta({ incluirArchivados })}`),
  /** Sube un archivo informando el avance; si ya existía uno idéntico, la API devuelve ese. */
  cargar: (archivo: File, duracionSegundos: number | undefined, alProgreso: (fraccion: number) => void, alEnviado?: () => void) => {
    const formulario = new FormData()
    formulario.append('archivo', archivo)
    if (duracionSegundos) {
      formulario.append('duracionSegundos', String(duracionSegundos))
    }
    return subirConProgreso<ArchivoMultimedia>('/multimedia', formulario, alProgreso, alEnviado)
  },
  cambiarArchivado: (id: number, estaArchivado: boolean) =>
    api.patch<ArchivoMultimedia>(`/multimedia/${id}`, { estaArchivado }),
  /** Ruta (no URL): el contenido requiere sesión, así que se obtiene con solicitarArchivo, no con un enlace directo. */
  rutaContenido: (id: number) => `/multimedia/${id}/contenido`,
}

export const anunciosApi = {
  listar: () => api.get<Anuncio[]>('/anuncios'),
  crear: (dto: GuardarAnuncio) => api.post<Anuncio>('/anuncios', dto),
  actualizar: (id: number, dto: GuardarAnuncio) => api.put<Anuncio>(`/anuncios/${id}`, dto),
}

export const listasApi = {
  listar: () => api.get<ListaReproduccionResumen[]>('/listas-reproduccion'),
  obtener: (id: number) => api.get<ListaReproduccion>(`/listas-reproduccion/${id}`),
  crear: (dto: GuardarListaReproduccion) => api.post<ListaReproduccion>('/listas-reproduccion', dto),
  actualizar: (id: number, dto: GuardarListaReproduccion) => api.put<ListaReproduccion>(`/listas-reproduccion/${id}`, dto),
  publicar: (id: number) => api.post<PublicacionLista>(`/listas-reproduccion/${id}/publicar`),
  publicaciones: (id: number) => api.get<PublicacionLista[]>(`/listas-reproduccion/${id}/publicaciones`),
}

export const asignacionesApi = {
  listar: (listaReproduccionId?: number) => api.get<AsignacionLista[]>(`/asignaciones${consulta({ listaReproduccionId })}`),
  crear: (dto: GuardarAsignacion) => api.post<AsignacionLista>('/asignaciones', dto),
  actualizar: (id: number, dto: GuardarAsignacion) => api.put<AsignacionLista>(`/asignaciones/${id}`, dto),
  eliminar: (id: number) => api.delete(`/asignaciones/${id}`),
}

export const publicacionesApi = {
  retirar: (id: number) => api.post<PublicacionLista>(`/publicaciones/${id}/retirar`),
  exportaciones: (id: number) => api.get<Exportacion[]>(`/publicaciones/${id}/exportaciones`),
  exportar: (id: number) => api.post<Exportacion>(`/publicaciones/${id}/exportaciones`),
  /** Ruta de descarga del paquete; requiere sesión (ver descargarArchivo). */
  rutaDescarga: (exportacionId: number) => `/exportaciones/${exportacionId}/descarga`,
}
