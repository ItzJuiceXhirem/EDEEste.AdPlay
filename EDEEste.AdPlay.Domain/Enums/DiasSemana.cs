namespace EDEEste.AdPlay.Domain.Enums
{
    [Flags]
    public enum DiasSemana
    {
        Ninguno = 0,
        Domingo = 1,
        Lunes = 2,
        Martes = 4,
        Miercoles = 8,
        Jueves = 16,
        Viernes = 32,
        Sabado = 64,
        Todos = Domingo | Lunes | Martes | Miercoles | Jueves | Viernes | Sabado
    }
}
