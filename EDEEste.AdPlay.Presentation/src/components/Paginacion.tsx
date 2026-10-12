interface Props {
  pagina: number
  tamanoPagina: number
  total: number
  alCambiar: (pagina: number) => void
}

export function Paginacion({ pagina, tamanoPagina, total, alCambiar }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina))
  return (
    <div className="paginacion">
      <span className="suave">{total} registros · página {pagina} de {totalPaginas}</span>
      <button className="mini" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>← Anterior</button>
      <button className="mini" disabled={pagina >= totalPaginas} onClick={() => alCambiar(pagina + 1)}>Siguiente →</button>
    </div>
  )
}
