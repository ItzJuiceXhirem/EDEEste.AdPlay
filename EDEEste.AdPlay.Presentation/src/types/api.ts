// Tipos de respuesta y entrada de la API (EDEEste.AdPlay.API). Mantener sincronizados con los DTO de Application.

export type ModoReproduccion = 'NavegadorWeb' | 'PaqueteLocal'
export type TipoMultimedia = 'Imagen' | 'Video'
export type EstadoPublicacion = 'Publicada' | 'Retirada'
export type EstadoExportacion = 'Pendiente' | 'Generando' | 'Completada' | 'Fallida'
export type EstadoOperativoPantalla = 'SinDatos' | 'EnLinea' | 'Desconectada'
export type NivelAsignacion = 'Sucursal' | 'GrupoPantalla' | 'Pantalla'
export type DiaSemana = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado' | 'Domingo'
export type Rol = 'Administrador' | 'Operador'
export type AccionAuditoria =
  | 'IniciarSesion' | 'InicioSesionFallido' | 'Crear' | 'Editar' | 'Habilitar' | 'Deshabilitar'
  | 'Eliminar' | 'Archivar' | 'Restaurar' | 'Publicar' | 'Retirar' | 'Exportar'
  | 'GenerarToken' | 'RevocarToken' | 'CambiarClave' | 'RestablecerClave' | 'CambiarFoto'

export interface Sucursal {
  id: number
  codigo: string
  nombre: string
  zonaHorariaId: string
  estaActiva: boolean
  fechaCreacionUtc: string
}

export interface GuardarSucursal {
  codigo: string
  nombre: string
  zonaHorariaId?: string | null
  estaActiva: boolean
}

export interface GrupoPantalla {
  id: number
  sucursalId: number
  nombreSucursal: string
  grupoPadreId: number | null
  nombre: string
  estaActivo: boolean
}

export interface GuardarGrupoPantalla {
  sucursalId: number
  grupoPadreId: number | null
  nombre: string
  estaActivo: boolean
}

export interface Pantalla {
  id: number
  codigoPantalla: string
  nombre: string
  modelo: string | null
  numeroSerie: string | null
  grupoPantallaId: number
  nombreGrupo: string
  sucursalId: number
  nombreSucursal: string
  modoReproduccion: ModoReproduccion
  estaHabilitada: boolean
  fechaCreacionUtc: string
  tieneTokenDispositivo: boolean
  estadoOperativo: EstadoOperativoPantalla
  ultimaConexionUtc: string | null
  ultimaVersionReportada: string | null
  ultimoError: string | null
}

export interface RegistrarPantalla {
  codigoPantalla: string
  nombre: string
  modelo?: string | null
  numeroSerie?: string | null
  grupoPantallaId: number
  modoReproduccion: ModoReproduccion
}

export type ActualizarPantalla = Partial<RegistrarPantalla & { estaHabilitada: boolean }>

export interface TokenDispositivo {
  pantallaId: number
  token: string
}

export interface ArchivoMultimedia {
  id: number
  nombreOriginal: string
  tipoMultimedia: TipoMultimedia
  tipoMime: string
  tamanoBytes: number
  hashSha256: string
  ancho: number | null
  alto: number | null
  duracionSegundos: number | null
  fechaCargaUtc: string
  estaArchivado: boolean
}

export interface Anuncio {
  id: number
  titulo: string
  descripcion: string | null
  archivoMultimediaId: number
  nombreArchivo: string
  tipoMultimedia: TipoMultimedia
  duracionPredeterminadaSegundos: number
  estaActivo: boolean
  fechaCreacionUtc: string
}

export interface GuardarAnuncio {
  titulo: string
  descripcion?: string | null
  archivoMultimediaId: number
  duracionPredeterminadaSegundos: number
  estaActivo: boolean
}

export interface ListaReproduccionResumen {
  id: number
  nombre: string
  descripcion: string | null
  estaActiva: boolean
  cantidadElementos: number
  fechaCreacionUtc: string
  fechaActualizacionUtc: string | null
  /** Suma de las duraciones efectivas de sus anuncios. */
  duracionTotalSegundos: number
  /** Número de la última versión publicada vigente; nulo si nunca se publicó o se retiró. */
  ultimaVersionPublicada: number | null
}

export interface ElementoLista {
  id: number
  posicion: number
  anuncioId: number
  tituloAnuncio: string
  archivoMultimediaId: number
  tipoMultimedia: TipoMultimedia
  duracionPersonalizadaSegundos: number | null
  duracionEfectivaSegundos: number
}

export interface ListaReproduccion {
  id: number
  nombre: string
  descripcion: string | null
  estaActiva: boolean
  fechaCreacionUtc: string
  fechaActualizacionUtc: string | null
  elementos: ElementoLista[]
}

export interface GuardarListaReproduccion {
  nombre: string
  descripcion?: string | null
  estaActiva: boolean
  elementos: { anuncioId: number; duracionPersonalizadaSegundos: number | null }[]
}

export interface AsignacionLista {
  id: number
  listaReproduccionId: number
  nombreLista: string
  nivel: NivelAsignacion
  sucursalId: number | null
  grupoPantallaId: number | null
  pantallaId: number | null
  nombreDestino: string
  estaHabilitada: boolean
  fechaInicioUtc: string | null
  fechaFinUtc: string | null
  fechaCreacionUtc: string
  activaAhora: boolean
  horarios: ReglaHorario[]
}

export interface GuardarAsignacion {
  listaReproduccionId: number
  sucursalId: number | null
  grupoPantallaId: number | null
  pantallaId: number | null
  estaHabilitada: boolean
  fechaInicioUtc: string | null
  fechaFinUtc: string | null
  /** Omitido = conservar los horarios actuales; arreglo vacío = quitarlos todos. */
  horarios?: GuardarReglaHorario[]
}

export interface ElementoPublicacion {
  posicion: number
  anuncioId: number
  archivoMultimediaId: number
  nombreArchivoPublicado: string
  duracionSegundos: number
  hashSha256: string
}

export interface PublicacionLista {
  id: number
  listaReproduccionId: number
  nombreLista: string
  numeroVersion: number
  version: string
  fechaPublicacionUtc: string
  estadoPublicacion: EstadoPublicacion
  elementos: ElementoPublicacion[]
}

export interface Exportacion {
  id: number
  publicacionListaId: number
  estadoExportacion: EstadoExportacion
  hashPaquete: string | null
  tamanoBytes: number | null
  fechaSolicitudUtc: string
  fechaFinalizacionUtc: string | null
  detalleError: string | null
}

export interface ElementoManifiesto {
  posicion: number
  anuncioId: number
  titulo: string
  archivoMultimediaId: number
  nombreArchivo: string
  ruta: string | null
  tipoMultimedia: TipoMultimedia
  tipoMime: string
  duracionSegundos: number
  tamanoBytes: number
  hashSha256: string
}

export interface Manifiesto {
  formatoManifiesto: number
  codigoPantalla: string | null
  habilitada: boolean
  version: string | null
  publicacionId: number | null
  numeroVersion: number | null
  nombreLista: string | null
  generadoUtc: string
  intervaloConsultaSegundos: number
  elementos: ElementoManifiesto[]
}

/** Respuesta de error RFC 9457 (ProblemDetails) que devuelve la API. */
export interface ProblemDetails {
  title?: string
  detail?: string
  status?: number
  traceId?: string
  errors?: Record<string, string[]>
}

/** Franja semanal de una asignación. Las horas van como "HH:mm:ss". */
export interface ReglaHorario {
  id: number
  dias: DiaSemana[]
  horaInicio: string
  horaFin: string
  zonaHorariaId: string
  estaActiva: boolean
}

export interface GuardarReglaHorario {
  dias: DiaSemana[]
  horaInicio: string
  horaFin: string
  /** Omitida = zona horaria predeterminada de la empresa. */
  zonaHorariaId?: string | null
  estaActiva: boolean
}

export interface Sesion {
  id: number
  correo: string
  nombreCompleto: string
  rol: Rol
  fechaCreacionUtc: string
  /** Cambia con cada foto nueva; nula si no tiene foto. */
  fotoVersion: string | null
}

export interface RespuestaTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface Usuario {
  id: number
  correo: string
  nombreCompleto: string
  rol: Rol
  estaActivo: boolean
  fechaCreacionUtc: string
  fotoVersion: string | null
}

export interface CrearUsuario {
  correo: string
  nombreCompleto: string
  rol: Rol
  clave: string
}

export interface ActualizarUsuario {
  nombreCompleto: string
  rol: Rol
  estaActivo: boolean
}

export interface Pagina<T> {
  elementos: T[]
  total: number
  pagina: number
  tamanoPagina: number
}

export interface RegistroAuditoria {
  id: number
  fechaUtc: string
  usuarioId: number | null
  nombreUsuario: string | null
  accion: AccionAuditoria
  tipoEntidad: string
  entidadId: number | null
  detalle: string | null
}

export interface HistorialPublicacion {
  id: number
  listaReproduccionId: number
  nombreLista: string
  numeroVersion: number
  version: string
  fechaPublicacionUtc: string
  estadoPublicacion: EstadoPublicacion
  cantidadElementos: number
  usuarioPublicador: string | null
}

export interface HistorialExportacion {
  id: number
  publicacionListaId: number
  nombreLista: string
  numeroVersion: number
  estadoExportacion: EstadoExportacion
  tamanoBytes: number | null
  hashPaquete: string | null
  fechaSolicitudUtc: string
  fechaFinalizacionUtc: string | null
  usuarioSolicitante: string | null
  detalleError: string | null
}

export interface EstadoPantallaReporte {
  pantallaId: number
  codigoPantalla: string
  nombre: string
  sucursalId: number
  nombreSucursal: string
  grupoPantallaId: number
  nombreGrupo: string
  modoReproduccion: ModoReproduccion
  estaHabilitada: boolean
  estadoOperativo: EstadoOperativoPantalla
  ultimaConexionUtc: string | null
  nombreListaEsperada: string | null
  versionEsperada: string | null
  versionReportada: string | null
  /** Nulo si no se puede saber (sin latidos, sin contenido esperado o en modo paquete local). */
  actualizada: boolean | null
  ultimoError: string | null
  numeroVersionEsperada: number | null
  /** Anuncios de la versión esperada, en orden de reproducción. */
  elementosEsperados: ElementoReproduccion[]
  /** Solo si está en línea y reproduce la versión esperada (la posición corresponde a elementosEsperados). */
  reproduccion: ReproduccionReportada | null
}

export interface ElementoReproduccion {
  posicion: number
  anuncioId: number
  titulo: string
  archivoMultimediaId: number
  tipoMultimedia: TipoMultimedia
  duracionSegundos: number
}

/** Anuncio que la pantalla informó en su último latido; el panel estima el avance desde reportadaUtc. */
export interface ReproduccionReportada {
  posicion: number
  anuncioId: number
  segundo: number
  reportadaUtc: string
}

export interface ResumenAuditoria {
  total: number
  accionesDeRiesgo: number
  iniciosSesionFallidos: number
  personas: number
}

export interface ResumenHistorial {
  publicaciones: number
  publicacionesRetiradas: number
  ultimaPublicacionUtc: string | null
  ultimaPublicacionLista: string | null
  ultimaPublicacionVersion: number | null
  exportaciones: number
  exportacionesCompletadas: number
  bytesPaquetes: number
}
