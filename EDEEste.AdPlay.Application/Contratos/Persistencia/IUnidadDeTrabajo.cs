namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IUnidadDeTrabajo
    {
        /// <summary>
        /// Persiste los cambios pendientes. Las violaciones de unicidad o de restricciones se traducen a ExcepcionConflicto.
        /// </summary>
        Task GuardarCambiosAsync(CancellationToken ct = default);
    }
}
