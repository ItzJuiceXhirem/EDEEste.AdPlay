namespace EDEEste.AdPlay.Application.Excepciones
{
    public class ExcepcionNoEncontrado : Exception
    {
        public ExcepcionNoEncontrado(string entidad, object id)
            : base($"No se encontró {entidad} con identificador '{id}'.")
        {
        }

        /// <summary>Con un mensaje propio, cuando el identificador no debe aparecer (por ejemplo, un token).</summary>
        public ExcepcionNoEncontrado(string mensaje)
            : base(mensaje)
        {
        }
    }
}
