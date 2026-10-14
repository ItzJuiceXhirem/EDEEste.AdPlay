# EDEEste.AdPlay

Sistema de gestión y reproducción de anuncios digitales para las pantallas de la empresa. Se administra desde una
aplicación web; las pantallas reproducen desde el navegador o con un paquete ZIP para el reproductor local.

La guía de diseño original es `EDEEste.AdPlay_Guia_Arquitectura.pdf`. Este archivo resume cómo está organizado el
código (o al menos su diseño base, ya que actualmente es más grande) y cómo trabajar con él. Para información
actualizada, revisar la guía `EDEEste.AdPlay_Documento_de_Traspaso.pdf` en la carpeta `docs/`. Ahí mismo se encuentra
el manual de usuario.

- Stitch para inspiración sobre el diseño: https://stitch.google.com/projects/10326607302982085645
- Fuentes: Charis SIL (https://fonts.google.com/specimen/Charis+SIL?categoryFilters=Feeling:%2FExpressive%2FBusiness)
  y Sansation (https://fonts.google.com/specimen/Sansation?categoryFilters=Feeling:%2FExpressive%2FBusiness)

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
- **Reproducción en curso:** el reproductor web informa en cada latido el anuncio que muestra y su segundo
  (`reproduccion` en `LatidoDto`). El reporte de supervisión devuelve los anuncios de la versión esperada y ese dato
  (solo si la pantalla está en línea con la versión esperada); el panel estima el avance entre latidos y lo muestra
  en Pantallas, con una vista ampliada. En paquete local no hay latidos con reproducción.
- **Foto de perfil:** `PUT /api/auth/foto` (multipart, campo `archivo`) y `DELETE /api/auth/foto` para la persona con
  sesión; `GET /api/usuarios/{id}/foto` la devuelve. Se valida como imagen (tipo, firma y hasta
  `Multimedia:TamanoMaximoFotoPerfilMb`, 2 MB). La sesión y el listado de usuarios traen `fotoVersion`, que cambia
  con cada foto; el panel la usa en la consulta (`?v=`) para poder guardarla en caché.
- **Resúmenes:** `GET /api/historial/resumen` y `GET /api/auditoria/resumen` devuelven los totales de las tarjetas
  de esas páginas con los mismos filtros que los listados.
- **Panel:** tema claro y oscuro (se guarda en el navegador, clave `adplay-tema`) con fuentes Charis SIL y Sansation.
  La migración `PanelNuevo` agrega las columnas de la foto de perfil y de la reproducción en curso.
- **Invitaciones:** desde Usuarios, un administrador invita a una persona con su correo y su rol
  (`POST /api/invitaciones`) y recibe un enlace `/activar?token=…` para compartirlo; con él la persona elige su
  contraseña y queda con la sesión iniciada (`POST /api/auth/invitacion` para consultarla y `POST /api/auth/activar`
  para activarla, ambos sin sesión y con límite de intentos). El enlace sirve una vez, vence a los 7 días y se guarda
  solo su hash; invitar de nuevo al mismo correo anula el enlace anterior, y `DELETE /api/invitaciones/{id}` lo anula
  a mano. También se puede seguir creando la cuenta con una contraseña inicial. Migración `Invitaciones`.

## Pendiente

- **Agente de sincronización local / SignalR:** el documento lo condiciona a respuestas de la Fase 0 que siguen sin
  confirmarse (dónde vive la carpeta de anuncios, si TI permite un agente, qué nivel de actualización se requiere).
  Hoy el modo local es descarga manual del ZIP y el modo web usa consultas periódicas.
- **Miniaturas de video:** el panel muestra la imagen real de los anuncios de imagen; para los videos usa un
  degradado, porque generar un cuadro requiere descargar el archivo completo. Se podría guardar un cuadro al subirlo.
- **Historial técnico de estados de pantalla** (`HistorialEstadoPantalla`), opcional en el documento.
- **Control de concurrencia en la edición:** si dos usuarios editan la misma lista, gana el último en guardar.
- **Exportación del paquete en segundo plano:** hoy se genera dentro de la petición HTTP.
- **Cuentas:** envío automático de las invitaciones por correo (hoy el administrador comparte el enlace),
  recuperación de contraseña por correo y autenticación en dos pasos.
- Ancho y alto de las imágenes no se calculan al subirlas.
- Pruebas de los casos de uso con repositorios simulados y pruebas de integración de la API.
