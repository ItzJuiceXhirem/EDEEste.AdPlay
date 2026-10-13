namespace EDEEste.AdPlay.Application.Excepciones
{
    public class ExcepcionValidacion : Exception
    {
        public ExcepcionValidacion(IDictionary<string, string[]> errores)
            : base("Uno o más datos no son válidos.")
        {
            Errores = errores;
        }

        public ExcepcionValidacion(string campo, string mensaje)
            : this(new Dictionary<string, string[]> { [campo] = [mensaje] })
        {
        }

        public IDictionary<string, string[]> Errores { get; }
    }
}
