namespace EDEEste.AdPlay.Domain.Enums
{
    /// <summary>
    /// Estado técnico derivado del último latido. Es independiente de Pantalla.EstaHabilitada (decisión administrativa).
    /// </summary>
    public enum EstadoOperativoPantalla
    {
        SinDatos = 0,
        EnLinea = 1,
        Desconectada = 2
    }
}
