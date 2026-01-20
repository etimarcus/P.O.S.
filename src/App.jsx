/**
 * C.O.S. — Community Operating System
 * Main application with quadrant layout
 */

import { useState, useCallback, useEffect } from 'react'
import { UpperLeft, UpperRight, LowerLeft, LowerRight } from './components/quadrants'
import './App.css'

function App() {
  const [infoMessage, setInfoMessage] = useState('')
  const [infoVisible, setInfoVisible] = useState(false)
  const [expandedQuadrant, setExpandedQuadrant] = useState(null)
  const [centerZoom, setCenterZoom] = useState(null) // { progress: 0-1, startTime }
  const [showFinances, setShowFinances] = useState(false)

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
    // Start zoom animation
    setCenterZoom({ progress: 0, startTime: performance.now() })
  }

  // Center zoom animation effect
  useEffect(() => {
    if (!centerZoom) return

    const duration = 500 // ms
    let animationId

    const animate = (currentTime) => {
      const elapsed = currentTime - centerZoom.startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)

      if (progress < 1) {
        setCenterZoom(prev => ({ ...prev, progress: eased }))
        animationId = requestAnimationFrame(animate)
      } else {
        // Animation complete - show finances view
        setCenterZoom(null)
        setShowFinances(true)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [centerZoom?.startTime])

  const handleBackFromFinances = () => {
    setShowFinances(false)
  }

  const handleExpand = useCallback((quadrant) => {
    setExpandedQuadrant(quadrant)
  }, [])

  const handleCollapse = useCallback(() => {
    setExpandedQuadrant(null)
  }, [])

  // Finances view (center zoom destination)
  if (showFinances) {
    return (
      <div className="app finances-view">
        <button className="back-button" onClick={handleBackFromFinances}>
          ← Back
        </button>
        <div className="finances-container">
          <h1>Personal Finances</h1>
          <p>Module under development</p>
        </div>
      </div>
    )
  }

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

      {/* Center zoom animation overlay */}
      {centerZoom && (
        <div
          className="center-zoom-overlay"
          style={{
            transform: `translate(-50%, -50%) scale(${1 + centerZoom.progress * 100})`,
            opacity: Math.min(1, centerZoom.progress * 2)
          }}
        />
      )}
    </div>
  )
}

export default App
