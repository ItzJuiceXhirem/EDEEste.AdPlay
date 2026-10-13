namespace EDEEste.AdPlay.Domain.Exceptions
{
    /// <summary>
    /// Se lanza cuando una operación viola una regla del dominio.
    /// </summary>
    public class ExcepcionDominio : Exception
    {
        public ExcepcionDominio(string mensaje) : base(mensaje)
        {
        }
    }
}
