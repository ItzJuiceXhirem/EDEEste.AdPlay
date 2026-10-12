import { solicitarArchivo } from '../services/clienteApi'

/** Descarga un archivo protegido y lo entrega al navegador como si fuera un enlace. */
export async function descargarArchivo(ruta: string, nombreSugerido: string): Promise<void> {
  const { blob, nombre } = await solicitarArchivo(ruta)
  guardarBlob(blob, nombre ?? nombreSugerido)
}

export function guardarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** CSV con separador de punto y coma y BOM, para que Excel en español lo abra bien con tildes. */
export function exportarCsv(nombre: string, columnas: string[], filas: (string | number | null)[][]): void {
  const escapar = (valor: string | number | null) => {
    const texto = valor === null ? '' : String(valor)
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  const lineas = [columnas, ...filas].map((fila) => fila.map(escapar).join(';'))
  guardarBlob(new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), nombre)
}
