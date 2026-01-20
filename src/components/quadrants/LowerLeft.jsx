/**
 * Lower Left Quadrant - "WE" Interior Collective
 * Hands - Giving & Receiving Contributions
 */

import './LowerLeft.css'

export function LowerLeft({ onNavigate, onShowInfo }) {
  const handleClick = () => {
    onNavigate?.('contributions')
  }

  const handleHandClick = (e, type) => {
    e.stopPropagation()
    onShowInfo?.(type === 'giving'
      ? 'Dar: Tus contribuciones a la comunidad'
      : 'Recibir: Lo que recibes de la comunidad')
  }

  return (
    <div className="quadrant quadrant-ll" onClick={handleClick}>
      <div className="quadrant-header">
        <div>
          <div className="quadrant-label">WE</div>
          <div className="quadrant-subtitle">Interior · Colectivo</div>
        </div>
      </div>

      <div className="quadrant-content">
        <div className="hands-container">
          <div
            className="hand hand-giving"
            onClick={(e) => handleHandClick(e, 'giving')}
          >
            <span className="hand-icon">🤲</span>
            <span className="hand-label">Dar</span>
            <span className="hand-stats">127 contribuciones</span>
          </div>

          <div className="hands-divider" />

          <div
            className="hand hand-receiving"
            onClick={(e) => handleHandClick(e, 'receiving')}
          >
            <span className="hand-icon">🤲</span>
            <span className="hand-label">Recibir</span>
            <span className="hand-stats">98 recepciones</span>
          </div>

          <div className="contribution-flow">
            <div className="flow-dot" />
            <div className="flow-dot" />
            <div className="flow-dot" />
          </div>
        </div>
      </div>

      <span className="click-hint">Click para explorar →</span>
    </div>
  )
}

export default LowerLeft
