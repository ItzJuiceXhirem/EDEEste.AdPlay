using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace EDEEste.AdPlay.Application.CasosDeUso.Pantallas
{
    /// <summary>
    /// Credenciales por dispositivo: se entrega el token en claro una vez y solo se guarda su hash.
    /// </summary>
    public static class TokensDispositivo
    {
        public static string Generar() => Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));

        public static string CalcularHash(string token) =>
            Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }
}
