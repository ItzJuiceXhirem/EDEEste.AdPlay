using EDEEste.AdPlay.API.Configuracion;
using EDEEste.AdPlay.API.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.AgregarServiciosApi();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}

// En desarrollo el panel llama por http://localhost:5218. Una redirección a https rompería la petición previa (preflight)
// de CORS, que el navegador no puede seguir, y el panel diría que no puede conectar con el servidor.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(ConfiguracionApi.PoliticaCors);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Toda la API exige un usuario autenticado salvo lo que se marca como anónimo (inicio de sesión y reproductor).
var api = app.MapGroup("/api");
api.MapearAutenticacion();
api.MapearUsuarios();
api.MapearInvitaciones();
api.MapearSucursales();
api.MapearPantallas();
api.MapearMultimedia();
api.MapearListasReproduccion();
api.MapearPublicaciones();
api.MapearConsultas();
api.MapearReproductor();

await app.AplicarMigracionesSiCorrespondeAsync();
await app.InicializarSeguridadSiCorrespondeAsync();

app.Run();
