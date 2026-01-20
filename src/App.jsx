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
    showInfo('💰 Finanzas Personales — Módulo en desarrollo')
    // TODO: Open personal finances module
  }

  const handleExpand = useCallback((quadrant) => {
    setExpandedQuadrant(quadrant)
  }, [])

  const handleCollapse = useCallback(() => {
    setExpandedQuadrant(null)
  }, [])

  // Expanded view
  if (expandedQuadrant) {
    const QuadrantComponent = {
      ul: UpperLeft,
      ur: UpperRight,
      ll: LowerLeft,
      lr: LowerRight
    }[expandedQuadrant]

    return (
      <div className="app expanded">
        <button className="back-button" onClick={handleCollapse}>
          ← Back
        </button>
        <div className="os-container expanded">
          <QuadrantComponent
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
        <UpperLeft onNavigate={handleNavigate} onShowInfo={showInfo} onExpand={() => handleExpand('ul')} />
        <UpperRight onNavigate={handleNavigate} onShowInfo={showInfo} onExpand={() => handleExpand('ur')} />
        <LowerLeft onNavigate={handleNavigate} onShowInfo={showInfo} onExpand={() => handleExpand('ll')} />
        <LowerRight onNavigate={handleNavigate} onShowInfo={showInfo} onExpand={() => handleExpand('lr')} />
      </div>

      {/* Info Panel */}
      <div className={`info-panel ${infoVisible ? 'visible' : ''}`}>
        {infoMessage}
      </div>
    </div>
  )
}

export default App
