using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Application.DTOs;
using EDEEste.AdPlay.Domain.Entities;

namespace EDEEste.AdPlay.Application.CasosDeUso.Publicaciones
{
    /// <summary>
    /// Construye el manifiesto de una publicación, común al reproductor web y a los paquetes ZIP.
    /// </summary>
    public static class ConstructorManifiesto
    {
        /// <param name="publicacion">Debe incluir Elementos con su Anuncio y ArchivoMultimedia, y la ListaReproduccion.</param>
        /// <param name="paraPaquete">Si es verdadero, cada elemento lleva su ruta relativa dentro del ZIP.</param>
        public static ManifiestoDto Construir(
            PublicacionLista publicacion,
            string? codigoPantalla,
            int intervaloConsultaSegundos,
            DateTime ahoraUtc,
            bool paraPaquete)
        {
            var elementos = publicacion.Elementos
                .OrderBy(e => e.Posicion)
                .Select(e => new ElementoManifiestoDto(
                    e.Posicion,
                    e.AnuncioId,
                    e.Anuncio.Titulo,
                    e.ArchivoMultimediaId,
                    e.NombreArchivoPublicado,
                    paraPaquete ? FormatoPaquete.RutaMedio(e.NombreArchivoPublicado) : null,
                    e.ArchivoMultimedia.TipoMultimedia,
                    e.ArchivoMultimedia.TipoMime,
                    e.DuracionSegundos,
                    e.ArchivoMultimedia.TamanoBytes,
                    e.HashSha256))
                .ToList();

            return new ManifiestoDto(
                ManifiestoDto.FormatoActual,
                codigoPantalla,
                Habilitada: true,
                publicacion.IdentificadorVersion,
                publicacion.Id,
                publicacion.NumeroVersion,
                publicacion.ListaReproduccion.Nombre,
                ahoraUtc,
                intervaloConsultaSegundos,
                elementos);
        }

        /// <summary>Manifiesto sin contenido: pantalla deshabilitada o sin lista publicada aplicable.</summary>
        public static ManifiestoDto Vacio(string codigoPantalla, bool habilitada, int intervaloConsultaSegundos, DateTime ahoraUtc) =>
            new(
                ManifiestoDto.FormatoActual,
                codigoPantalla,
                habilitada,
                Version: null,
                PublicacionId: null,
                NumeroVersion: null,
                NombreLista: null,
                ahoraUtc,
                intervaloConsultaSegundos,
                []);
    }
}
