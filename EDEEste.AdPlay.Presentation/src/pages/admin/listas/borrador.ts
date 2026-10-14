import { DURACION_SEGUNDOS } from '../../../constants/limites'
import type { Anuncio, ListaReproduccion, TipoMultimedia } from '../../../types/api'

/** Un anuncio dentro de la lista en edición. La clave es local: los elementos nuevos aún no existen en el servidor. */
export interface ElementoBorrador {
  clave: number
  anuncioId: number
  /** Duración personalizada en segundos como texto del campo; vacía = la predeterminada del anuncio. */
  duracion: string
}

/** Cambios sin guardar de una lista. Mientras existe, la lista se muestra «Sin guardar». */
export interface Borrador {
  nombre: string
  descripcion: string
  activa: boolean
  elementos: ElementoBorrador[]
}

export interface InfoAnuncio {
  titulo: string
  tipo: TipoMultimedia
  archivoId: number
  predeterminada: number
}

export function borradorDe(lista: ListaReproduccion): Borrador {
  return {
    nombre: lista.nombre,
    descripcion: lista.descripcion ?? '',
    activa: lista.estaActiva,
    elementos: lista.elementos.map((e) => ({
      clave: e.id,
      anuncioId: e.anuncioId,
      duracion: e.duracionPersonalizadaSegundos?.toString() ?? '',
    })),
  }
}

/** Datos del anuncio para mostrar un elemento; si ya no está en el catálogo, se usan los que trae la lista. */
export function infoAnuncio(anuncioId: number, anuncios: Anuncio[], lista: ListaReproduccion | undefined): InfoAnuncio {
  const anuncio = anuncios.find((a) => a.id === anuncioId)
  if (anuncio) {
    return {
      titulo: anuncio.titulo,
      tipo: anuncio.tipoMultimedia,
      archivoId: anuncio.archivoMultimediaId,
      predeterminada: anuncio.duracionPredeterminadaSegundos,
    }
  }
  const elemento = lista?.elementos.find((e) => e.anuncioId === anuncioId)
  return {
    titulo: elemento?.tituloAnuncio ?? `Anuncio ${anuncioId}`,
    tipo: elemento?.tipoMultimedia ?? 'Imagen',
    archivoId: elemento?.archivoMultimediaId ?? 0,
    predeterminada: elemento?.duracionEfectivaSegundos ?? 10,
  }
}

export function limitarDuracion(valor: number): number {
  return Math.min(DURACION_SEGUNDOS.maxima, Math.max(DURACION_SEGUNDOS.minima, Math.round(valor)))
}

export function duracionDe(e: ElementoBorrador, info: InfoAnuncio): number {
  const personalizada = Number(e.duracion)
  return e.duracion && Number.isFinite(personalizada) && personalizada > 0 ? limitarDuracion(personalizada) : info.predeterminada
}
