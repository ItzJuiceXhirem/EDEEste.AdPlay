import type { DiaSemana, Rol } from '../types/api'

/** Nombres de rol; coinciden con Domain/Common/RolesSistema en la API. */
export const ROLES = {
  administrador: 'Administrador',
  operador: 'Operador',
} as const satisfies Record<string, Rol>

/** Qué rol requiere cada zona del panel. La API es quien lo hace cumplir; aquí solo se oculta lo que no aplica. */
export const SOLO_ADMINISTRADOR: Rol[] = [ROLES.administrador]

/** Orden de presentación de los días (el enum de la API empieza en domingo). */
export const DIAS_SEMANA: { dia: DiaSemana; etiqueta: string; corta: string }[] = [
  { dia: 'Lunes', etiqueta: 'Lunes', corta: 'Lun' },
  { dia: 'Martes', etiqueta: 'Martes', corta: 'Mar' },
  { dia: 'Miercoles', etiqueta: 'Miércoles', corta: 'Mié' },
  { dia: 'Jueves', etiqueta: 'Jueves', corta: 'Jue' },
  { dia: 'Viernes', etiqueta: 'Viernes', corta: 'Vie' },
  { dia: 'Sabado', etiqueta: 'Sábado', corta: 'Sáb' },
  { dia: 'Domingo', etiqueta: 'Domingo', corta: 'Dom' },
]
