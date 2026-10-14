namespace EDEEste.AdPlay.Domain.Enums
{
    /// <summary>Estado de una invitación; se calcula a partir de sus fechas, no se guarda.</summary>
    public enum EstadoInvitacion
    {
        Pendiente = 1,
        Vencida = 2,
        Activada = 3,
        Revocada = 4
    }
}
