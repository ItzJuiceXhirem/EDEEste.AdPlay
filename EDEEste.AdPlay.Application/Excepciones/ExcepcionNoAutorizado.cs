namespace EDEEste.AdPlay.Application.Excepciones
{
    public class ExcepcionNoAutorizado : Exception
    {
        public ExcepcionNoAutorizado(string mensaje) : base(mensaje)
        {
        }
    }
}
