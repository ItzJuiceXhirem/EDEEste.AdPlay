using EDEEste.AdPlay.Domain.Common;

namespace EDEEste.AdPlay.Application.Contratos.Persistencia
{
    public interface IRepositorio<T> where T : EntidadBase
    {
        Task<T?> ObtenerPorIdAsync(int id, CancellationToken ct = default);
        void Agregar(T entidad);
        void Eliminar(T entidad);
    }
}
