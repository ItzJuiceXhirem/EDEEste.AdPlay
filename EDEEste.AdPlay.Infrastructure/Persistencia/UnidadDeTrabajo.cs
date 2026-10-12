using EDEEste.AdPlay.Application.Contratos.Persistencia;
using EDEEste.AdPlay.Application.Excepciones;
using EDEEste.AdPlay.Infrastructure.Auditoria;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace EDEEste.AdPlay.Infrastructure.Persistencia
{
    public class UnidadDeTrabajo : IUnidadDeTrabajo
    {
        private const int ErrorIndiceUnico = 2601;
        private const int ErrorRestriccionUnica = 2627;
        private const int ErrorRestriccion = 547;

        private readonly ContextoPublicidad _contexto;
        private readonly RegistroAuditoriaEf _auditoria;

        public UnidadDeTrabajo(ContextoPublicidad contexto, RegistroAuditoriaEf auditoria)
        {
            _contexto = contexto;
            _auditoria = auditoria;
        }

        public async Task GuardarCambiosAsync(CancellationToken ct = default)
        {
            try
            {
                if (_auditoria.HayPendientes)
                {
                    await GuardarConAuditoriaAsync(ct);
                }
                else
                {
                    await _contexto.SaveChangesAsync(ct);
                }
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException sql)
            {
                throw sql.Number switch
                {
                    ErrorIndiceUnico or ErrorRestriccionUnica =>
                        new ExcepcionConflicto("Ya existe un registro con esos datos únicos.", ex),
                    ErrorRestriccion =>
                        new ExcepcionConflicto("La operación viola una restricción de la base de datos o deja registros relacionados huérfanos.", ex),
                    _ => ex
                };
            }
        }

        /// <summary>
        /// Guarda primero los cambios de negocio (para conocer los identificadores generados) y después los registros
        /// de auditoría, todo en una transacción: o se guarda la acción con su registro, o ninguno de los dos.
        /// </summary>
        private async Task GuardarConAuditoriaAsync(CancellationToken ct)
        {
            await using var transaccion = await _contexto.Database.BeginTransactionAsync(ct);
            await _contexto.SaveChangesAsync(ct);

            _contexto.RegistrosAuditoria.AddRange(_auditoria.TomarPendientes());
            await _contexto.SaveChangesAsync(ct);

            await transaccion.CommitAsync(ct);
        }
    }
}
