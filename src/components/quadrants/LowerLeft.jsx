/**
 * Lower Left Quadrant - "WE" Interior Collective
 * Hands - Giving & Receiving Contributions
 * Visual hand template with words on fingers
 */

import { useState, useCallback } from 'react'
import './LowerLeft.css'

// Give hand words (left hand - palm facing viewer)
const GIVE_WORDS = [
  { id: 'effort', text: 'Effort', finger: 'thumb' },
  { id: 'motus', text: 'Motus', finger: 'index' },
  { id: 'voluntas', text: 'Voluntas', finger: 'middle' },
  { id: 'cognito', text: 'Cognito', finger: 'ring' },
  { id: 'tempus', text: 'Tempus', finger: 'pinky' }
]

// Receive hand words (right hand - palm facing viewer)
const RECEIVE_WORDS = [
  { id: 'health', text: 'Health', finger: 'thumb' },
  { id: 'social', text: 'Social', finger: 'index' },
  { id: 'work', text: 'Work', finger: 'middle' },
  { id: 'career', text: 'Career', finger: 'ring' },
  { id: 'family', text: 'Family', finger: 'pinky' }
]

export function LowerLeft({ onNavigate, onShowInfo, onExpand, expanded }) {
  const [selectedWord, setSelectedWord] = useState(null)
  const [hoveredHand, setHoveredHand] = useState(null)

  const handleClick = () => {
    if (!expanded) {
      onNavigate?.('contributions')
    }
  }

  const handleHeaderClick = (e) => {
    e.stopPropagation()
    if (onExpand && !expanded) {
      onExpand()
    }
  }

  const handleWordClick = useCallback((e, word, hand) => {
    e.stopPropagation()
    setSelectedWord({ ...word, hand })
    onShowInfo?.(`${hand === 'give' ? 'Dar' : 'Recibir'}: ${word.text}`)
  }, [onShowInfo])

  const handleWordHover = useCallback((word, hand) => {
    setHoveredHand(hand)
  }, [])

  return (
    <div className={`quadrant quadrant-ll ${expanded ? 'expanded' : ''}`} onClick={handleClick}>
      <div className="quadrant-header" onClick={handleHeaderClick} style={{ cursor: expanded ? 'default' : 'pointer' }}>
        <div>
          <div className="quadrant-label">WE</div>
          <div className="quadrant-subtitle">Interior · Colectivo</div>
        </div>
      </div>

      <div className="quadrant-content">
        <div className="hands-visual-container">
          {/* Give Hand (Left) */}
          <div
            className={`hand-visual hand-give ${hoveredHand === 'give' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredHand('give')}
            onMouseLeave={() => setHoveredHand(null)}
          >
            <div className="hand-title">Give</div>
            <svg viewBox="0 0 200 280" className="hand-svg">
              {/* Palm */}
              <path
                className="palm"
                d="M40,280 L40,180 Q40,160 60,160 L140,160 Q160,160 160,180 L160,280 Z"
              />
              {/* Thumb */}
              <path
                className="finger finger-thumb"
                d="M40,180 Q20,170 15,140 Q10,110 25,90 Q40,75 55,85 Q60,100 60,160"
              />
              {/* Index */}
              <path
                className="finger finger-index"
                d="M60,160 L60,50 Q60,30 75,30 Q90,30 90,50 L90,160"
              />
              {/* Middle */}
              <path
                className="finger finger-middle"
                d="M90,160 L90,25 Q90,5 105,5 Q120,5 120,25 L120,160"
              />
              {/* Ring */}
              <path
                className="finger finger-ring"
                d="M120,160 L120,35 Q120,15 135,15 Q150,15 150,35 L150,160"
              />
              {/* Pinky */}
              <path
                className="finger finger-pinky"
                d="M150,160 L150,70 Q150,50 165,50 Q180,50 180,70 L180,160 Q180,165 160,160"
              />
            </svg>

            {/* Words on fingers */}
            <div className="finger-words">
              {GIVE_WORDS.map((word) => (
                <span
                  key={word.id}
                  className={`finger-word finger-word-${word.finger} ${selectedWord?.id === word.id ? 'selected' : ''}`}
                  onClick={(e) => handleWordClick(e, word, 'give')}
                  onMouseEnter={() => handleWordHover(word, 'give')}
                >
                  {word.text}
                </span>
              ))}
            </div>
          </div>

          {/* Center divider with ampersand */}
          <div className="hands-center">
            <span className="ampersand">&</span>
          </div>

          {/* Receive Hand (Right) */}
          <div
            className={`hand-visual hand-receive ${hoveredHand === 'receive' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredHand('receive')}
            onMouseLeave={() => setHoveredHand(null)}
          >
            <div className="hand-title">Receive</div>
            <svg viewBox="0 0 200 280" className="hand-svg">
              {/* Palm */}
              <path
                className="palm"
                d="M40,280 L40,180 Q40,160 60,160 L140,160 Q160,160 160,180 L160,280 Z"
              />
              {/* Pinky */}
              <path
                className="finger finger-pinky"
                d="M20,160 Q20,165 40,160 L40,70 Q40,50 55,50 Q70,50 70,70 L70,160"
              />
              {/* Ring */}
              <path
                className="finger finger-ring"
                d="M70,160 L70,35 Q70,15 85,15 Q100,15 100,35 L100,160"
              />
              {/* Middle */}
              <path
                className="finger finger-middle"
                d="M100,160 L100,25 Q100,5 115,5 Q130,5 130,25 L130,160"
              />
              {/* Index */}
              <path
                className="finger finger-index"
                d="M130,160 L130,50 Q130,30 145,30 Q160,30 160,50 L160,160"
              />
              {/* Thumb */}
              <path
                className="finger finger-thumb"
                d="M160,160 Q160,100 165,85 Q175,75 190,90 Q205,110 200,140 Q195,170 175,180 L160,180"
              />
            </svg>

            {/* Words on fingers */}
            <div className="finger-words">
              {RECEIVE_WORDS.map((word) => (
                <span
                  key={word.id}
                  className={`finger-word finger-word-${word.finger} ${selectedWord?.id === word.id ? 'selected' : ''}`}
                  onClick={(e) => handleWordClick(e, word, 'receive')}
                  onMouseEnter={() => handleWordHover(word, 'receive')}
                >
                  {word.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Flow indicator */}
        <div className="contribution-flow">
          <div className="flow-dot" />
          <div className="flow-dot" />
          <div className="flow-dot" />
        </div>
      </div>

      <span className="click-hint">Click para explorar →</span>

      {/* Word detail bubble */}
      {selectedWord && (
        <div className="word-bubble" onClick={(e) => { e.stopPropagation(); setSelectedWord(null); }}>
          <div className="bubble-content" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setSelectedWord(null)}>×</button>
            <h3>{selectedWord.text}</h3>
            <span className="bubble-hand-type">{selectedWord.hand === 'give' ? 'Dar' : 'Recibir'}</span>
            <p className="bubble-description">
              {getWordDescription(selectedWord.id)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Word descriptions
function getWordDescription(wordId) {
  const descriptions = {
    // Give
    effort: 'El esfuerzo físico y mental que contribuyes a la comunidad.',
    motus: 'El movimiento y acción que generas para impulsar proyectos.',
    voluntas: 'Tu voluntad y determinación para crear cambio positivo.',
    cognito: 'El conocimiento y sabiduría que compartes con otros.',
    tempus: 'El tiempo que dedicas al servicio de la comunidad.',
    // Receive
    health: 'Bienestar físico y mental que recibes de la comunidad.',
    social: 'Conexiones y relaciones significativas con otros miembros.',
    work: 'Oportunidades laborales y colaboración en proyectos.',
    career: 'Desarrollo profesional y crecimiento en tu carrera.',
    family: 'Sentido de pertenencia y apoyo familiar comunitario.'
  }
  return descriptions[wordId] || 'Descripción pendiente.'
}

export default LowerLeft
