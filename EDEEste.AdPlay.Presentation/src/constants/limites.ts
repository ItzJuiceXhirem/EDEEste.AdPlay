// Límites de validación del lado del cliente. Reflejan los de la API (Domain: LongitudesMaximas y ReglasDuracion);
// la API es quien los hace cumplir, aquí solo se usan para guiar al usuario.

export const LONGITUDES = {
  codigoSucursal: 30,
  codigoPantalla: 50,
  nombre: 100,
  nombreCompleto: 150,
  modelo: 100,
  tituloAnuncio: 150,
  descripcion: 500,
} as const

export const DURACION_SEGUNDOS = {
  minima: 1,
  maxima: 3600,
} as const

/** Zona horaria de la empresa; coincide con Domain/Common/ZonasHorarias en la API. */
export const ZONA_HORARIA_PREDETERMINADA = 'America/Santo_Domingo'

/** Debe coincidir con los formatos de ValidadorArchivosMultimedia en la API. */
export const FORMATOS_MULTIMEDIA = '.jpg,.jpeg,.png,.webp,.mp4,.webm'
