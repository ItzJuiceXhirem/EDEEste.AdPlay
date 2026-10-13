using EDEEste.AdPlay.Application.Excepciones;

namespace EDEEste.AdPlay.Application.Validaciones
{
    /// <summary>
    /// Acumula errores por campo y los lanza juntos como <see cref="ExcepcionValidacion"/>.
    /// </summary>
    public sealed class ErroresValidacion
    {
        private readonly Dictionary<string, List<string>> _errores = new();

        public void Agregar(string campo, string mensaje)
        {
            if (!_errores.TryGetValue(campo, out var lista))
            {
                lista = new List<string>();
                _errores[campo] = lista;
            }

            lista.Add(mensaje);
        }

        public void Texto(string campo, string? valor, int longitudMaxima, bool requerido = true)
        {
            if (string.IsNullOrWhiteSpace(valor))
            {
                if (requerido)
                {
                    Agregar(campo, "Es obligatorio.");
                }

                return;
            }

            if (valor.Trim().Length > longitudMaxima)
            {
                Agregar(campo, $"No puede exceder {longitudMaxima} caracteres.");
            }
        }

        public void Rango(string campo, int? valor, int minimo, int maximo)
        {
            if (valor.HasValue && (valor < minimo || valor > maximo))
            {
                Agregar(campo, $"Debe estar entre {minimo} y {maximo}.");
            }
        }

        public void ZonaHoraria(string campo, string? zonaHorariaId)
        {
            if (string.IsNullOrWhiteSpace(zonaHorariaId))
            {
                Agregar(campo, "Es obligatorio.");
            }
            else if (!TimeZoneInfo.TryFindSystemTimeZoneById(zonaHorariaId, out _))
            {
                Agregar(campo, $"La zona horaria '{zonaHorariaId}' no existe.");
            }
        }

        public void LanzarSiHayErrores()
        {
            if (_errores.Count > 0)
            {
                throw new ExcepcionValidacion(_errores.ToDictionary(e => e.Key, e => e.Value.ToArray()));
            }
        }
    }
}
