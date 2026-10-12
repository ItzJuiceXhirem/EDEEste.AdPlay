namespace EDEEste.AdPlay.Application.Contratos.Servicios
{
    /// <summary>
    /// Usuario que ejecuta la operación en curso. En la API sale de la sesión autenticada.
    /// </summary>
    public interface IUsuarioActual
    {
        bool EstaAutenticado { get; }
        int? Id { get; }
        string? Nombre { get; }
    }
}
