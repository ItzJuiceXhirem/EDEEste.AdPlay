interface Props {
  pagina: number
  tamanoPagina: number
  total: number
  alCambiar: (pagina: number) => void
}

/** Números de página a mostrar: todos si son pocos; si no, la primera, la última y las vecinas de la actual. */
function paginasVisibles(actual: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const vecinas = [actual - 1, actual, actual + 1].filter((n) => n > 1 && n < total)
  const resultado: (number | null)[] = [1]
  if (vecinas[0] > 2) {
    resultado.push(null)
  }
  resultado.push(...vecinas)
  if (vecinas[vecinas.length - 1] < total - 1) {
    resultado.push(null)
  }
  resultado.push(total)
  return resultado
}

export function Paginacion({ pagina, tamanoPagina, total, alCambiar }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina))
  const actual = Math.min(pagina, totalPaginas)
  const desde = (actual - 1) * tamanoPagina
  const hasta = Math.min(total, desde + tamanoPagina)

  return (
    <div className="paginacion" style={{ borderTop: '1px solid var(--hundida)' }}>
      <span className="suave" style={{ fontSize: 13 }}>
        {total ? `Mostrando ${desde + 1}–${hasta} de ${total}` : 'Sin registros'}
      </span>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} aria-label="Paginación">
        <button className="pagina" type="button" onClick={() => alCambiar(actual - 1)} disabled={actual <= 1}>
          Anterior
        </button>
        {paginasVisibles(actual, totalPaginas).map((n, i) =>
          n === null ? (
            <span key={`hueco-${i}`} className="suave" aria-hidden="true" style={{ padding: '0 4px' }}>
              …
            </span>
          ) : (
            <button
              key={n}
              className={`pagina${n === actual ? ' activa' : ''}`}
              type="button"
              onClick={() => alCambiar(n)}
              aria-current={n === actual ? 'page' : undefined}
              aria-label={`Página ${n}`}
            >
              {n}
            </button>
          ),
        )}
        <button className="pagina" type="button" onClick={() => alCambiar(actual + 1)} disabled={actual >= totalPaginas}>
          Siguiente
        </button>
      </nav>
    </div>
  )
}
