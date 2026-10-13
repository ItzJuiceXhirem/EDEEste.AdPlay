namespace EDEEste.AdPlay.Domain.Common
{
    /// <summary>
    /// Roles de la aplicación. Qué puede hacer cada uno se define en las políticas de la API.
    /// </summary>
    public static class RolesSistema
    {
        /// <summary>Administra todo: estructura, asignaciones, publicación, usuarios y auditoría.</summary>
        public const string Administrador = "Administrador";

        /// <summary>Prepara contenido (multimedia, anuncios, listas) y exporta paquetes; no publica ni administra.</summary>
        public const string Operador = "Operador";

        public static readonly IReadOnlyList<string> Todos = [Administrador, Operador];
    }
}
