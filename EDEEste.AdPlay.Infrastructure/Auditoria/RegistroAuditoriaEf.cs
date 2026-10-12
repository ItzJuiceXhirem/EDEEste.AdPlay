using EDEEste.AdPlay.Application.Comunes;
using EDEEste.AdPlay.Application.Contratos.Servicios;
using EDEEste.AdPlay.Domain.Common;
using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Enums;

namespace EDEEste.AdPlay.Infrastructure.Auditoria
{
    /// <summary>
    /// Acumula los registros de auditoría de la operación en curso. No toca la base de datos:
    /// <see cref="Persistencia.UnidadDeTrabajo"/> los guarda junto con los cambios, en una sola transacción.
    /// </summary>
    public sealed class RegistroAuditoriaEf : IRegistroAuditoria
    {
        private readonly IUsuarioActual _usuarioActual;
        private readonly TimeProvider _reloj;
        private readonly List<(RegistroAuditoria Registro, EntidadBase? Entidad)> _pendientes = [];

        public RegistroAuditoriaEf(IUsuarioActual usuarioActual, TimeProvider reloj)
        {
            _usuarioActual = usuarioActual;
            _reloj = reloj;
        }

        public void Registrar(AccionAuditoria accion, EntidadBase entidad, string? detalle = null) =>
            Agregar(accion, entidad.GetType().Name, entidad.Id == 0 ? null : entidad.Id, entidad, detalle, _usuarioActual.Id);

        public void Registrar(AccionAuditoria accion, string tipoEntidad, int? entidadId, string? detalle = null, int? usuarioId = null) =>
            Agregar(accion, tipoEntidad, entidadId, null, detalle, usuarioId ?? _usuarioActual.Id);

        /// <summary>Entrega los registros acumulados y vacía la lista. Si la entidad era nueva, ya tiene su identificador.</summary>
        internal IReadOnlyList<RegistroAuditoria> TomarPendientes()
        {
            var registros = _pendientes
                .Select(p =>
                {
                    if (p.Entidad is { Id: not 0 })
                    {
                        p.Registro.EntidadId = p.Entidad.Id;
                    }

                    return p.Registro;
                })
                .ToList();
            _pendientes.Clear();
            return registros;
        }

        internal bool HayPendientes => _pendientes.Count > 0;

        private void Agregar(AccionAuditoria accion, string tipoEntidad, int? entidadId, EntidadBase? entidad, string? detalle, int? usuarioId) =>
            _pendientes.Add((
                new RegistroAuditoria
                {
                    UsuarioId = usuarioId,
                    Accion = accion,
                    TipoEntidad = tipoEntidad,
                    EntidadId = entidadId,
                    FechaUtc = _reloj.GetUtcNow().UtcDateTime,
                    Detalle = detalle.Recortar(LongitudesMaximas.DetalleAuditoria)
                },
                entidad));
    }
}
