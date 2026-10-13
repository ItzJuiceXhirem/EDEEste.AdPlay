namespace EDEEste.AdPlay.API.Seguridad
{
    public sealed class OpcionesSeguridad
    {
        public const string Seccion = "Seguridad";

        /// <summary>Duración del token de acceso. Un cambio de rol o una desactivación rige al renovarlo.</summary>
        public int DuracionAccesoMinutos { get; set; } = 30;

        /// <summary>Duración del token de renovación: tiempo máximo de una sesión sin volver a iniciar sesión.</summary>
        public int DuracionRenovacionHoras { get; set; } = 12;

        /// <summary>Intentos de inicio de sesión permitidos por minuto desde una misma dirección IP.</summary>
        public int IntentosInicioSesionPorMinuto { get; set; } = 10;

        /// <summary>Si es verdadero, al iniciar crea los roles y el administrador inicial configurado.</summary>
        public bool InicializarAlIniciar { get; set; }
    }
}
