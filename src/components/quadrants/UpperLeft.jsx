/**
 * Upper Left Quadrant - "I" Interior Individual
 * Vitruvian Man with Identity Layers (Bio, Credentials, Peer Perception)
 */

import { useState } from 'react'
import './UpperLeft.css'

export function UpperLeft({ onNavigate, onShowInfo }) {
  const [hoveredRing, setHoveredRing] = useState(null)

  const handleClick = () => {
    onNavigate?.('identity-layers')
  }

  const rings = [
    { id: 'bio', label: 'Biológica', color: '#ef5350' },
    { id: 'cred', label: 'Credenciales', color: '#42a5f5' },
    { id: 'peer', label: 'Percepción', color: '#66bb6a' }
  ]

  return (
    <div className="quadrant quadrant-ul" onClick={handleClick}>
      <div className="quadrant-header">
        <div>
          <div className="quadrant-label">I</div>
          <div className="quadrant-subtitle">Interior · Individual</div>
        </div>
      </div>

      <div className="quadrant-content">
        <div className="vitruvian-container">
          {rings.map((ring) => (
            <div
              key={ring.id}
              className={`identity-ring ring-${ring.id}`}
              style={{ borderColor: ring.color }}
              onMouseEnter={() => setHoveredRing(ring.id)}
              onMouseLeave={() => setHoveredRing(null)}
              onClick={(e) => {
                e.stopPropagation()
                onShowInfo?.(`Capa: ${ring.label}`)
              }}
            >
              <span
                className="ring-label"
                style={{
                  color: ring.color,
                  opacity: hoveredRing === ring.id ? 1 : 0
                }}
              >
                {ring.label}
              </span>
            </div>
          ))}
          <div className="vitruvian-image" />
        </div>
      </div>

      <span className="click-hint">Click para explorar →</span>
    </div>
  )
}

export default UpperLeft
