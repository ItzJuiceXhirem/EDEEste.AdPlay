namespace EDEEste.AdPlay.Application.Excepciones
{
    /// <summary>
    /// La operación choca con el estado actual: duplicados, asignaciones ambiguas o versiones concurrentes.
    /// </summary>
    public class ExcepcionConflicto : Exception
    {
        public ExcepcionConflicto(string mensaje, Exception? interna = null) : base(mensaje, interna)
        {
        }
    }
}
