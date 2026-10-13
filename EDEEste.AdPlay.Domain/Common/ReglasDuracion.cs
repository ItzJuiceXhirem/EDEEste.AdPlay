namespace EDEEste.AdPlay.Domain.Common
{
    public static class ReglasDuracion
    {
        public const int MinimoSegundos = 1;
        public const int MaximoSegundos = 3600;

        public static bool EsValida(int segundos) => segundos is >= MinimoSegundos and <= MaximoSegundos;
    }
}
