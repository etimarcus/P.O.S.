/**
 * Lower Right Quadrant - "ITS" Exterior Collective
 * Cell Canvas - Bird's Eye View of Settlement
 */

import './LowerRight.css'

const DIVIDER_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

const HOUSING_PODS = [
  { top: '25%', left: '80%' },
  { top: '50%', left: '88%' },
  { top: '75%', left: '80%' },
  { top: '85%', left: '50%' },
  { top: '75%', left: '20%' },
  { top: '50%', left: '12%' },
  { top: '25%', left: '20%' }
]

export function LowerRight({ onNavigate, onShowInfo }) {
  const handleClick = () => {
    onNavigate?.('cell-canvas')
  }

  const handlePodClick = (e, index) => {
    e.stopPropagation()
    const letter = String.fromCharCode(65 + index)
    onShowInfo?.(`Compound ${letter}: Unidades habitacionales`)
  }

  const handleKernelClick = (e) => {
    e.stopPropagation()
    onShowInfo?.('Guild Kernel: Centro de operaciones')
  }

  return (
    <div className="quadrant quadrant-lr" onClick={handleClick}>
      <div className="quadrant-header">
        <div>
          <div className="quadrant-label">ITS</div>
          <div className="quadrant-subtitle">Exterior · Colectivo</div>
        </div>
      </div>

      <div className="quadrant-content">
        <div className="cell-canvas">
          {/* Concentric rings */}
          <div className="cell-ring cell-outer" />
          <div className="cell-ring cell-paths" />
          <div className="cell-ring cell-agriculture" />
          <div className="cell-ring cell-common" />
          <div
            className="cell-ring cell-kernel"
            onClick={handleKernelClick}
          />

          {/* Radial dividers */}
          {DIVIDER_ANGLES.map((angle) => (
            <div
              key={angle}
              className="cell-divider"
              style={{ transform: `rotate(${angle}deg) translateY(-150px)` }}
            />
          ))}

          {/* Housing pods */}
          {HOUSING_PODS.map((pod, i) => (
            <div
              key={i}
              className="housing-pod"
              style={{ top: pod.top, left: pod.left }}
              onClick={(e) => handlePodClick(e, i)}
            />
          ))}

          {/* Water feature */}
          <div className="water-feature" />

          <span className="cell-name">Célula Rocha Norte</span>
        </div>
      </div>

      <span className="click-hint">Click para explorar →</span>
    </div>
  )
}

export default LowerRight
