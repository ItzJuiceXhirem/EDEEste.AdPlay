using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Repositorios
{
    public abstract class RepositorioBase<T> : IRepositorio<T> where T : EntidadBase
    {
        protected RepositorioBase(ContextoPublicidad contexto)
        {
            Contexto = contexto;
        }

        protected ContextoPublicidad Contexto { get; }
        protected DbSet<T> Conjunto => Contexto.Set<T>();

        public virtual async Task<T?> ObtenerPorIdAsync(int id, CancellationToken ct = default) =>
            await Conjunto.FindAsync([id], ct);

        public void Agregar(T entidad) => Conjunto.Add(entidad);

        public void Eliminar(T entidad) => Conjunto.Remove(entidad);
    }
}
