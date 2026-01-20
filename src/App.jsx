/**
 * C.O.S. — Community Operating System
 * Main application with quadrant layout
 */

import { useState, useCallback } from 'react'
import { UpperLeft, UpperRight, LowerLeft, LowerRight } from './components/quadrants'
import './App.css'

function App() {
  const [infoMessage, setInfoMessage] = useState('')
  const [infoVisible, setInfoVisible] = useState(false)
  const [expandedQuadrant, setExpandedQuadrant] = useState(null)

  const showInfo = useCallback((message) => {
    setInfoMessage(message)
    setInfoVisible(true)

    setTimeout(() => {
      setInfoVisible(false)
    }, 3000)
  }, [])

  const handleNavigate = useCallback((destination) => {
    const pageNames = {
      'identity-layers': 'UL: Capas de Identidad — Identity, Avatars, Roles, Tasks',
      'issues-cloud': 'UR: Nube de Issues — Topics → Issues → Argument Maps',
      'contributions': 'LL: Contribuciones — Dar & Recibir, Issues Cloud, Repository',
      'cell-canvas': 'LR: Vista de Célula — Infraestructura, Guild Kernel, Compounds'
    }
    showInfo(pageNames[destination] || destination)
  }, [showInfo])

  const handleCenterClick = () => {
    showInfo('C.O.S. — Community Operating System v0.1')
  }

  const handleExpand = useCallback((quadrant) => {
    setExpandedQuadrant(quadrant)
  }, [])

  const handleCollapse = useCallback(() => {
    setExpandedQuadrant(null)
  }, [])

  // Expanded view
  if (expandedQuadrant === 'ur') {
    return (
      <div className="app expanded">
        <button className="back-button" onClick={handleCollapse}>
          ← Back
        </button>
        <div className="os-container expanded">
          <UpperRight
            onNavigate={handleNavigate}
            onShowInfo={showInfo}
            expanded={true}
          />
        </div>
        <div className={`info-panel ${infoVisible ? 'visible' : ''}`}>
          {infoMessage}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Cross dividers */}
      <div className="cross-vertical" />
      <div className="cross-horizontal" />
      <div className="cross-center" onClick={handleCenterClick} />

      {/* Quadrant grid */}
      <div className="os-container">
        <UpperLeft onNavigate={handleNavigate} onShowInfo={showInfo} />
        <UpperRight onNavigate={handleNavigate} onShowInfo={showInfo} onExpand={() => handleExpand('ur')} />
        <LowerLeft onNavigate={handleNavigate} onShowInfo={showInfo} />
        <LowerRight onNavigate={handleNavigate} onShowInfo={showInfo} />
      </div>

      {/* Info Panel */}
      <div className={`info-panel ${infoVisible ? 'visible' : ''}`}>
        {infoMessage}
      </div>
    </div>
  )
}

export default App
