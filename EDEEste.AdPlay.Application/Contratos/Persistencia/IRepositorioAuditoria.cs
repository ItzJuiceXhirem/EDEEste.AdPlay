using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public sealed record FiltroAuditoria(
        DateTime? DesdeUtc = null,
        DateTime? HastaUtc = null,
        int? UsuarioId = null,
        AccionAuditoria? Accion = null,
        string? TipoEntidad = null);

    public interface IRepositorioAuditoria
    {
        /// <summary>Registros más recientes primero.</summary>
        Task<(IReadOnlyList<RegistroAuditoria> Registros, int Total)> ListarAsync(
            FiltroAuditoria filtro, int pagina, int tamanoPagina, CancellationToken ct = default);
    }
}
