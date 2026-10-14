import { requisitosClave, TEXTO_FORTALEZA } from '../utils/clave'
import { Icono } from './Icono'

/** Barra de fortaleza (cada nivel termina en su propio color) y lista de requisitos de la contraseña. */
export function FortalezaClave({ clave, dosColumnas = true, conTitulo = true }: { clave: string; dosColumnas?: boolean; conTitulo?: boolean }) {
  const requisitos = requisitosClave(clave)
  const cumplidos = requisitos.filter((r) => r.cumple).length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {conTitulo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="etiqueta">Seguridad de la contraseña</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--titulo)' }}>{TEXTO_FORTALEZA[cumplidos]}</span>
        </div>
      )}
      <div className="barra" role="progressbar" aria-label="Requisitos cumplidos" aria-valuemin={0} aria-valuemax={4} aria-valuenow={cumplidos}>
        <div
          className="barra-fuerza"
          // El degradado se dibuja a lo ancho de toda la pista; así cada nivel termina en su propio color.
          style={{ width: `${cumplidos * 25}%`, backgroundSize: `${cumplidos ? 400 / cumplidos : 100}% 100%` }}
        />
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: '2px 0 0',
          padding: 0,
          display: 'grid',
          gridTemplateColumns: dosColumnas ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
          gap: '8px 12px',
        }}
      >
        {requisitos.map((r) => (
          <li key={r.texto} className={`requisito${r.cumple ? ' cumple' : ''}`}>
            <span className="requisito-marca" aria-hidden="true">
              <Icono nombre="marca" tamano={10} grosor={4} />
            </span>
            <span>{r.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
