import type { CSSProperties, ReactNode } from 'react'

// Íconos de trazo (24×24) del sistema visual. Se dibujan con currentColor para heredar el color del texto.
const trazos = {
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  luna: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  pulso: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  edificio: (
    <>
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  edificioMas: (
    <>
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="M12 10v6M9 13h6" />
    </>
  ),
  pantalla: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  pantallaApagada: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4M9 8l6 4M15 8l-6 4" />
    </>
  ),
  imagen: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  lista: (
    <>
      <path d="M8 6h13M8 12h13M8 18h8" />
      <path d="M3 5l2 1-2 1zM3 11l2 1-2 1zM3 17l2 1-2 1z" />
    </>
  ),
  historial: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  restaurar: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  personas: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M19 14a6 6 0 0 1 3 7" />
    </>
  ),
  persona: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  salir: <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />,
  derecha: <path d="M9 6l6 6-6 6" />,
  abajo: <path d="M6 9l6 6 6-6" />,
  candado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  camara: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  alerta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  advertencia: (
    <>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  ojo: (
    <>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  ojoTachado: (
    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 5.4-1.6" />
  ),
  marca: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  cargando: <path d="M21 12a9 9 0 1 1-6.2-8.6" />,
  menos: <path d="M5 12h14" />,
  mas: <path d="M12 5v14M5 12h14" />,
  descargar: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  subir: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  guardar: (
    <>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M8 3v5h7V3M8 21v-7h8v7" />
    </>
  ),
  enviar: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  flechaArriba: <path d="M12 19V5M6 11l6-6 6 6" />,
  flechaAbajo: <path d="M12 5v14M6 13l6 6 6-6" />,
  flechaDerecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  ubicacion: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  editar: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  papelera: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  archivar: <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />,
  caja: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" />
    </>
  ),
  volumen: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  nube: (
    <>
      <path d="M7 18a5 5 0 0 1-.8-9.9A6 6 0 0 1 17.7 9 4.5 4.5 0 0 1 17 18" />
      <path d="M12 12v8M9 15l3-3 3 3" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="5" width="15" height="14" rx="2" />
      <path d="M17 10l5-3v10l-5-3" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cuadricula: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  filas: <path d="M3 6h18M3 12h18M3 18h18" />,
  ampliar: <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />,
  enlace: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  carpeta: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  actualizar: (
    <>
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </>
  ),
  llave: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2L20 3M17 6l3 3M14 9l2 2" />
    </>
  ),
  arroba: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" />
    </>
  ),
  copiar: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
} satisfies Record<string, ReactNode>

// Íconos rellenos (controles de reproducción y asa de arrastre).
const rellenos = {
  reproducir: <path d="M8 5v14l11-7z" />,
  pausa: <path d="M7 5h4v14H7zM13 5h4v14h-4z" />,
  anterior: <path d="M6 5h2v14H6zM20 5v14L9 12z" />,
  siguiente: <path d="M16 5h2v14h-2zM4 5v14l11-7z" />,
  asa: (
    <>
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type NombreIcono = keyof typeof trazos | keyof typeof rellenos

interface Props {
  nombre: NombreIcono
  tamano?: number
  grosor?: number
  className?: string
  style?: CSSProperties
  /** Texto para lectores de pantalla; sin él, el ícono es decorativo. */
  titulo?: string
}

export function Icono({ nombre, tamano = 18, grosor = 2, className, style, titulo }: Props) {
  const relleno = nombre in rellenos
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill={relleno ? 'currentColor' : 'none'}
      stroke={relleno ? 'none' : 'currentColor'}
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: 'none', ...style }}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      {relleno ? rellenos[nombre as keyof typeof rellenos] : trazos[nombre as keyof typeof trazos]}
    </svg>
  )
}
