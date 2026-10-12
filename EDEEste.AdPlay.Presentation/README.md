# EDEEste.AdPlay.Presentation

Panel de administración (`/admin`) y reproductor web (`/reproductor`) de EDEEste.AdPlay. React + TypeScript + Vite.

La arquitectura general, las convenciones y cómo ejecutar el sistema completo están en el
[README de la raíz](../README.md).

## Estructura de `src`

| Carpeta | Contenido |
|---|---|
| `types/` | Tipos de las respuestas y entradas de la API (reflejan los DTO de Application). |
| `services/` | Llamadas HTTP (`clienteApi` con sesión y renovación de token, `adminApi`, `sesionApi`, `consultasApi`, `reproductorApi`) y almacenamiento local (`almacenSesion` del usuario, `almacenReproductor` del dispositivo). |
| `context/` | Estado de sesión (`ProveedorAuth`); se consume con `hooks/useAuth`. |
| `hooks/` | `useDatos`/`useAccion` (carga y acciones con estado) y `useSincronizacionReproductor`. |
| `components/` | Componentes compartidos y layout del panel. |
| `pages/admin/` | Una página por área del panel (supervisión, historial, usuarios, auditoría…); las más grandes se dividen en una subcarpeta. |
| `pages/reproductor/` | Reproductor en pantalla completa. |
| `constants/` | Límites de validación que reflejan los de la API. |

## Scripts

```bash
npm run dev     # servidor de desarrollo (http://localhost:5173)
npm run build   # comprueba tipos y compila
npm run lint    # ESLint
```

El panel exige iniciar sesión; los controles que el rol no permite se ocultan (la API es quien lo hace cumplir).
`VITE_API_BASE_URL` es obligatoria; en desarrollo viene en `.env.development`. No coloque secretos en variables `VITE_*`.
