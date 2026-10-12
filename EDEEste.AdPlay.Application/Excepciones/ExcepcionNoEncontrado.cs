namespace EDEEste.AdPlay.Application.Excepciones
{
    public class ExcepcionNoEncontrado : Exception
    {
        public ExcepcionNoEncontrado(string entidad, object id)
            : base($"No se encontró {entidad} con identificador '{id}'.")
        {
        }
    }
}
