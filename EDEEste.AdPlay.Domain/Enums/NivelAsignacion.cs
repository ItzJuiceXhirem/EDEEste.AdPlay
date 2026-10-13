namespace EDEEste.AdPlay.Domain.Enums
{
    /// <summary>
    /// Destino de una asignación. El valor más alto tiene prioridad al resolver qué lista reproduce una pantalla.
    /// </summary>
    public enum NivelAsignacion
    {
        Sucursal = 1,
        GrupoPantalla = 2,
        Pantalla = 3
    }
}
