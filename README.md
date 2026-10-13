# EDEEste.AdPlay

Sistema de gestión y reproducción de anuncios digitales para las pantallas de la empresa. Se administra desde una
aplicación web; las pantallas reproducen desde el navegador o con un paquete ZIP para el reproductor local.

La guía de diseño original es `EDEEste.AdPlay_Guia_Arquitectura.pdf`. Este archivo resume cómo está organizado el
código y cómo trabajar con él.

## Arquitectura

Clean Architecture / Onion: las dependencias apuntan hacia el centro.

```
Presentation (React) --HTTP--> API --> Application --> Domain
                                 \--> Infrastructure --> Application, Domain
```

| Proyecto | Responsabilidad | Depende de |
|---|---|---|
| `EDEEste.AdPlay.Domain` | Entidades, enums, reglas de negocio puras. Sin dependencias. | — |
| `EDEEste.AdPlay.Application` | Casos de uso, DTOs, validaciones, contratos (interfaces). | Domain |
| `EDEEste.AdPlay.Infrastructure` | EF Core/SQL Server, repositorios, almacenamiento de archivos, generación de ZIP. Implementa los contratos de Application. | Application, Domain |
| `EDEEste.AdPlay.API` | Endpoints HTTP, manejo de errores, DI y configuración (raíz de composición). | Application, Infrastructure |
| `EDEEste.AdPlay.Presentation` | Panel de administración (`/admin`) y reproductor web (`/reproductor`). Consume la API por HTTP. | — |
| `tests/EDEEste.AdPlay.Tests` | Pruebas de Domain, Application y del modelo de EF Core (sin base de datos). | Domain, Application, Infrastructure |

### Convenciones

- **Idioma:** el lenguaje de negocio (entidades, propiedades, tablas, casos de uso) está en español; los términos
  técnicos comunes en inglés (`Entities`, `Enums`, `Endpoints`, `Services`).
- **Un tipo por archivo** en C#. Los DTO se agrupan por área en un mismo archivo (`DTOs/*Dtos.cs`).
- **Los endpoints nunca exponen entidades**, solo DTO. No consultan `ContextoPublicidad`: llaman a los servicios de
  `Application/CasosDeUso`.
- **Reglas de negocio** que no necesitan base de datos viven en Domain (`Domain/Services`, métodos de las entidades) y
  tienen pruebas. Los casos de uso orquestan: cargan, llaman al dominio, persisten.
- **Constantes compartidas** (longitudes de texto, límites de duración, zona horaria) están en `Domain/Common`.
  Las usan tanto las validaciones como el esquema de EF; no repetir números sueltos.
- **Errores:** los casos de uso lanzan `ExcepcionValidacion` (400), `ExcepcionNoEncontrado` (404),
  `ExcepcionConflicto` (409) o `ExcepcionNoAutorizado` (401); `ManejadorExcepciones` los traduce a ProblemDetails.
- **Fechas:** siempre UTC (`...Utc`). Se convierten a hora local solo en la interfaz.
- **Archivos multimedia:** inmutables y fuera de SQL Server. La clave de almacenamiento la genera el sistema; los
  medios referenciados no se borran, se archivan.
- **Publicaciones:** son instantáneas inmutables. Editar una lista no cambia una versión ya publicada.
- **Auditoría:** los casos de uso que cambian algo llaman a `IRegistroAuditoria.Registrar(...)` antes de guardar. El
  registro se guarda en la misma transacción que el cambio. Nunca incluyas contraseñas, tokens ni secretos en el detalle.
- **Usuarios:** el Dominio solo conoce ids de usuario (`int?`); Identity vive en `Infrastructure/Identidad` y se usa a
  través de `IGestorUsuarios` e `IUsuarioActual`.

## Seguridad

Toda la API exige un usuario autenticado, salvo el inicio de sesión y los endpoints del reproductor (que se
autentican con el token de su pantalla). La sesión es un token Bearer: `POST /api/auth/iniciar-sesion` devuelve
`accessToken` y `refreshToken`; `POST /api/auth/renovar` obtiene uno nuevo.

| Política | Quién | Operaciones |
|---|---|---|
| `Lectura` | Cualquier usuario autenticado | Consultar todo, supervisión, historial. |
| `Contenido` | Administrador y Operador | Subir y archivar multimedia, anuncios, listas, exportar paquetes. |
| `Administracion` | Solo Administrador | Sucursales, grupos, pantallas y sus tokens, asignaciones, **publicar y retirar versiones**, usuarios y auditoría. |

- **Contraseñas:** mínimo 10 caracteres con mayúscula, minúscula y número; bloqueo temporal de la cuenta tras 5
  intentos fallidos. Configuración en `Infrastructure/InyeccionDependencias.cs`.
- **Sesión:** el token de acceso dura 30 minutos y la sesión, 12 horas (`Seguridad:*`). Al renovar se vuelve a leer el
  rol y el estado del usuario, así que un cambio de rol o una desactivación rige como máximo al renovar.
- **Límite de intentos:** 10 por minuto y por dirección IP en inicio de sesión y renovación. Si despliegas detrás de un
  proxy inverso, configura `ForwardedHeaders` para que la API vea la IP real del cliente.
- **Llaves de Data Protection:** los tokens de sesión se protegen con ellas. En producción con más de una instancia,
  o si los usuarios no deben perder la sesión al reiniciar, persístelas en un almacén compartido.
- **Registro de primera vez:** mientras el sistema no tenga ningún usuario, el inicio de sesión ofrece "Cree la primera
  cuenta" (`/registro`), que crea al primer administrador. En cuanto existe cualquier usuario ese registro se cierra
  (la API responde 409); las demás cuentas las crea un administrador. No hay registro abierto a propósito.
- **Administrador inicial por configuración (alternativa):** con `Seguridad:InicializarAlIniciar=true`, al arrancar se crean los roles y, si no hay
  usuarios, el administrador de `Seguridad:AdministradorInicial` (`Correo`, `NombreCompleto`, `Clave`). Define esos
  valores con User Secrets o variables de entorno, nunca en un archivo del repositorio:

```bash
dotnet user-secrets set "Seguridad:AdministradorInicial:Correo" "admin@empresa.com" --project EDEEste.AdPlay.API
dotnet user-secrets set "Seguridad:AdministradorInicial:Clave" "<contraseña>" --project EDEEste.AdPlay.API
```

  En `Development` la inicialización ya está activada. En producción actívala, inicia una vez y desactívala.

### Cómo agregar una funcionalidad

1. Entidad o regla en `Domain` (con su prueba).
2. Contrato en `Application/Contratos`, DTOs, validador y caso de uso en `Application/CasosDeUso`; regístralo en
   `Application/InyeccionDependencias.cs`.
3. Configuración de EF y repositorio en `Infrastructure`; regístralo en `Infrastructure/InyeccionDependencias.cs`.
4. Endpoint en `API/Endpoints` y mapeo en `Program.cs`.
5. Migración (ver abajo) y, si aplica, tipos y servicio en `Presentation/src/{types,services}`.

## Cómo ejecutarlo

Requisitos: .NET 10 SDK, Node.js, una instancia de SQL Server accesible.

### Cadena de conexión (User Secrets)

La cadena **no** está en el repositorio. En desarrollo se guarda con el gestor de secretos:

```bash
dotnet user-secrets set "ConnectionStrings:AdPlay" "Server=localhost;Database=EDEEsteAdPlay;Trusted_Connection=True;TrustServerCertificate=True" --project EDEEste.AdPlay.API
```

Si falta, la API no arranca y explica cómo configurarla. En otros ambientes usa la variable de entorno
`ConnectionStrings__AdPlay` o el gestor de secretos corporativo. `TrustServerCertificate=True` es solo para
desarrollo.

### API

```bash
dotnet run --project EDEEste.AdPlay.API --launch-profile http
```

En `Development` aplica las migraciones al iniciar (`BaseDatos:AplicarMigracionesAlIniciar`). En otros ambientes
aplícalas como paso del despliegue. Los medios se guardan en `Almacenamiento:RutaRaiz` (por defecto
`App_Data/Almacenamiento`, ignorado por git). En producción usa un directorio o recurso compartido con permisos
restringidos y respaldo.

### Frontend

```bash
cd EDEEste.AdPlay.Presentation
npm install
npm run dev
```

`VITE_API_BASE_URL` es obligatoria; en desarrollo viene en `.env.development` (API en `http://localhost:5218`).
Para usar otra URL localmente crea `.env.local` (ignorado por git).

- Panel: http://localhost:5173/admin
- Inicio de sesión: http://localhost:5173/iniciar-sesion (con el administrador inicial de User Secrets).
- Reproductor: se abre con el enlace que muestra el panel al generar el token de una pantalla
  (`/reproductor?token=…`). El token se guarda en el dispositivo y se quita de la barra de direcciones.

## Migraciones

```bash
dotnet ef migrations add NombreDelCambio --project EDEEste.AdPlay.Infrastructure --startup-project EDEEste.AdPlay.API --output-dir Persistencia/Migraciones
dotnet ef database update --project EDEEste.AdPlay.Infrastructure --startup-project EDEEste.AdPlay.API
```

Cambiar un valor de `LongitudesMaximas` o de las restricciones CHECK requiere una migración.

## Pruebas

```bash
dotnet test
npm run build --prefix EDEEste.AdPlay.Presentation
npm run lint --prefix EDEEste.AdPlay.Presentation
```

## Estado frente al plan de trabajo

- **Fase 1 (imprescindibles), Fase 2 (supervisión) y Fase 3 (horarios, usuarios y roles, auditoría, historial y
  reportes):** implementadas.
- **Horarios:** una asignación puede tener franjas semanales con zona horaria. Fuera de ellas la pantalla usa la
  siguiente asignación en prioridad. Dos asignaciones del mismo destino no pueden coincidir en fechas y horario.
- **Supervisión:** el reporte `/api/reportes/estado-pantallas` compara la versión que cada pantalla *debería*
  reproducir con la que informó haber cargado.

## Pendiente

- **Agente de sincronización local / SignalR:** el documento lo condiciona a respuestas de la Fase 0 que siguen sin
  confirmarse (dónde vive la carpeta de anuncios, si TI permite un agente, qué nivel de actualización se requiere).
  Hoy el modo local es descarga manual del ZIP y el modo web usa consultas periódicas.
- **Historial técnico de estados de pantalla** (`HistorialEstadoPantalla`), opcional en el documento.
- **Control de concurrencia en la edición:** si dos usuarios editan la misma lista, gana el último en guardar.
- **Exportación del paquete en segundo plano:** hoy se genera dentro de la petición HTTP.
- **Cuentas:** recuperación de contraseña por correo y autenticación en dos pasos.
- Ancho y alto de las imágenes no se calculan al subirlas.
- Pruebas de los casos de uso con repositorios simulados y pruebas de integración de la API.
