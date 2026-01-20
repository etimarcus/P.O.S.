/**
 * Upper Right Quadrant - "IT" Exterior Individual
 * Hierarchical Word Cloud for Issues/Topics
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import './UpperRight.css'

// Size mapping based on child count or explicit size
const getSizeFromChildCount = (childCount) => {
  if (childCount >= 8) return 'xl'
  if (childCount >= 5) return 'lg'
  if (childCount >= 3) return 'md'
  if (childCount >= 1) return 'sm'
  return 'xs'
}

// Calculate positions ensuring no overlap, clustered around center
const calculateWordPositions = (words) => {
  const placed = []

  // Estimate word width based on text length and size class
  const getWordDims = (word) => {
    const charWidth = {
      xl: 3.5,
      lg: 2.8,
      md: 2.2,
      sm: 1.8,
      xs: 1.4
    }
    const heights = { xl: 10, lg: 8, md: 7, sm: 6, xs: 5 }
    const cw = charWidth[word.size] || 1.8
    const textLen = word.text?.length || 5
    return {
      w: Math.max(textLen * cw, 8),
      h: heights[word.size] || 6
    }
  }

  // Check if two rectangles overlap
  const overlaps = (pos1, pos2) => {
    const pad = 2
    return !(pos1.x + pos1.w/2 + pad < pos2.x - pos2.w/2 ||
             pos1.x - pos1.w/2 > pos2.x + pos2.w/2 + pad ||
             pos1.y + pos1.h/2 + pad < pos2.y - pos2.h/2 ||
             pos1.y - pos1.h/2 > pos2.y + pos2.h/2 + pad)
  }

  // Check if position overlaps with any placed word
  const hasCollision = (pos) => {
    for (const p of placed) {
      if (overlaps(pos, p)) return true
    }
    return false
  }

  // Find position using Archimedean spiral from center
  const findPosition = (word) => {
    const dims = getWordDims(word)
    const centerX = 50
    const centerY = 50

    // Spiral parameters
    const a = 0  // Start at center
    const b = 1.5  // Spiral spacing

    for (let t = 0; t < 200; t += 0.3) {
      const r = a + b * t
      const x = centerX + r * Math.cos(t)
      const y = centerY + r * Math.sin(t) * 0.6  // Compress vertically

      // Check bounds
      if (x < 5 || x > 95 || y < 10 || y > 90) continue

      const newPos = { x, y, w: dims.w, h: dims.h }

      if (!hasCollision(newPos)) {
        placed.push(newPos)
        return { id: word.id, x, y }
      }
    }

    // Fallback: grid search
    for (let gy = 15; gy <= 85; gy += 8) {
      for (let gx = 10; gx <= 90; gx += 8) {
        const newPos = { x: gx, y: gy, w: dims.w, h: dims.h }
        if (!hasCollision(newPos)) {
          placed.push(newPos)
          return { id: word.id, x: gx, y: gy }
        }
      }
    }

    // Last resort
    placed.push({ x: 50, y: 50, w: dims.w, h: dims.h })
    return { id: word.id, x: 50, y: 50 }
  }

  // Sort by size (larger words placed first, near center)
  const sorted = [...words].sort((a, b) => {
    const order = { xl: 0, lg: 1, md: 2, sm: 3, xs: 4 }
    return (order[a.size] || 4) - (order[b.size] || 4)
  })

  return sorted.map(word => findPosition(word))
}

export function UpperRight({ onNavigate, onShowInfo, onExpand, expanded }) {
  const [path, setPath] = useState(['root'])
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [wordsMap, setWordsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [definitionBubble, setDefinitionBubble] = useState(null)

  // Fetch words from Supabase
  useEffect(() => {
    async function fetchWords() {
      try {
        const { data, error } = await supabase
          .from('word_cloud')
          .select('*')

        if (error) throw error

        // Build a map of id -> word data
        const map = {}

        // First pass: create entries for all words
        data.forEach(word => {
          map[String(word.id)] = {
            ...word,
            label: word.word,
            children: []
          }
        })

        // Second pass: find children by parent_id
        // Words with parent_id pointing to another word are children of that word
        data.forEach(word => {
          if (word.parent_id) {
            const parentId = String(word.parent_id)
            if (map[parentId]) {
              map[parentId].children.push({
                id: String(word.id),
                text: word.word,
                size: 'md',
                color: word.ministry_color
              })
            }
          }
        })

        // Update sizes based on child count
        Object.values(map).forEach(word => {
          word.children.forEach(child => {
            child.size = getSizeFromChildCount(map[child.id]?.children?.length || 0)
          })
        })

        // Root words are tier 1
        const rootWords = data.filter(word => word.tier === 1)

        // Create virtual root node
        map['root'] = {
          label: 'topics',
          children: rootWords.map(word => ({
            id: String(word.id),
            text: word.word,
            size: getSizeFromChildCount(map[String(word.id)]?.children?.length || 0),
            color: word.ministry_color
          }))
        }

        setWordsMap(map)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching words:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    fetchWords()
  }, [])

  const currentNodeId = path[path.length - 1]
  const currentNode = wordsMap[currentNodeId]
  const currentTopics = currentNode?.children || []

  // Calculate positions for current topics
  const wordPositions = useMemo(() => {
    if (currentTopics.length === 0) return {}
    const positions = calculateWordPositions(currentTopics)
    const posMap = {}
    positions.forEach(p => { posMap[p.id] = { x: p.x, y: p.y } })
    return posMap
  }, [currentTopics])

  const handleWordClick = useCallback(async (e, topic) => {
    e.stopPropagation()

    // Check if this topic has children
    if (wordsMap[topic.id]?.children?.length > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setPath(prev => [...prev, topic.id])
        setIsTransitioning(false)
      }, 150)
    } else {
      // Leaf node - fetch definition and image from Wikipedia
      const wordData = wordsMap[topic.id]
      setDefinitionBubble({ word: topic.text, loading: true, ministry: wordData?.ministry_name })

      try {
        // Fetch from Wikipedia API
        const searchTerm = topic.text.replace(/-/g, ' ')
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`
        const response = await fetch(wikiUrl)

        if (response.ok) {
          const data = await response.json()
          setDefinitionBubble({
            word: topic.text,
            definition: data.extract || 'No definition found',
            ministry: wordData?.ministry_name,
            image: data.thumbnail?.source || null,
            wikiUrl: data.content_urls?.desktop?.page || null
          })
        } else {
          // Fallback to dictionary API
          const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${searchTerm}`)
          if (dictResponse.ok) {
            const dictData = await dictResponse.json()
            const definition = dictData[0]?.meanings[0]?.definitions[0]?.definition || 'No definition found'
            setDefinitionBubble({
              word: topic.text,
              definition,
              ministry: wordData?.ministry_name,
              searchUrl: `https://www.google.com/search?q=${encodeURIComponent(topic.text)}&tbm=isch`
            })
          } else {
            throw new Error('Not found')
          }
        }
      } catch (err) {
        setDefinitionBubble({
          word: topic.text,
          definition: wordData?.description || `Tema relacionado con ${wordData?.ministry_name || 'este proyecto'}`,
          ministry: wordData?.ministry_name,
          searchUrl: `https://www.google.com/search?q=${encodeURIComponent(topic.text)}`
        })
      }
    }
  }, [wordsMap])

  const handleBreadcrumbClick = useCallback((e, index) => {
    e.stopPropagation()
    if (index < path.length - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setPath(prev => prev.slice(0, index + 1))
        setIsTransitioning(false)
      }, 150)
    }
  }, [path.length])

  const handleQuadrantClick = () => {
    if (path.length > 1) {
      // Go back one level
      setIsTransitioning(true)
      setTimeout(() => {
        setPath(prev => prev.slice(0, -1))
        setIsTransitioning(false)
      }, 150)
    } else if (!expanded) {
      onNavigate?.('issues-cloud')
    }
  }

  const handleHeaderClick = (e) => {
    e.stopPropagation()
    if (onExpand && !expanded) {
      onExpand()
    }
  }

  const containerRef = useRef(null)

  // Wheel zoom with passive: false
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3))
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // Reset zoom when navigating
  useEffect(() => {
    setZoom(1)
  }, [path])

  // Build breadcrumb labels
  const breadcrumbLabels = path.map(nodeId =>
    wordsMap[nodeId]?.label || nodeId
  )

  if (loading) {
    return (
      <div className="quadrant quadrant-ur">
        <div className="quadrant-header">
          <div>
            <div className="quadrant-label">IT</div>
            <div className="quadrant-subtitle">Exterior · Individual</div>
          </div>
        </div>
        <div className="quadrant-content">
          <div className="loading">Cargando...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="quadrant quadrant-ur">
        <div className="quadrant-header">
          <div>
            <div className="quadrant-label">IT</div>
            <div className="quadrant-subtitle">Exterior · Individual</div>
          </div>
        </div>
        <div className="quadrant-content">
          <div className="error">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`quadrant quadrant-ur ${expanded ? 'expanded' : ''}`} onClick={handleQuadrantClick}>
      <div className="quadrant-header" onClick={handleHeaderClick} style={{ cursor: expanded ? 'default' : 'pointer' }}>
        <div>
          <div className="quadrant-label">IT</div>
          <div className="quadrant-subtitle">Exterior · Individual</div>
        </div>
      </div>

      <div className="quadrant-content">
        <div className="breadcrumb">
          {breadcrumbLabels.map((label, i) => (
            <span key={i}>
              {i > 0 && <span className="breadcrumb-separator"> / </span>}
              <span
                className={`breadcrumb-item ${i === breadcrumbLabels.length - 1 ? 'active' : ''}`}
                onClick={(e) => handleBreadcrumbClick(e, i)}
              >
                {label}
              </span>
            </span>
          ))}
        </div>

        <div
          ref={containerRef}
          className={`wordcloud-container ${isTransitioning ? 'transitioning' : ''}`}
          style={{ transform: `scale(${zoom})` }}
        >
          {currentTopics.map((topic, i) => {
            const hasChildren = wordsMap[topic.id]?.children?.length > 0
            const pos = wordPositions[topic.id] || { x: 50, y: 50 }
            return (
              <span
                key={topic.id}
                className={`word-item word-${topic.size} ${hasChildren ? 'has-children' : ''}`}
                onClick={(e) => handleWordClick(e, topic)}
                style={{
                  animationDelay: `${i * 30}ms`,
                  color: topic.color || undefined,
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {topic.text}
                {hasChildren && <span className="word-indicator">›</span>}
              </span>
            )
          })}
        </div>

        {path.length > 1 && (
          <div className="back-hint">
            ← click para volver
          </div>
        )}
      </div>

      <span className="click-hint">
        {path.length > 1 ? 'Click para volver' : 'Click palabra para explorar →'}
      </span>

      {definitionBubble && (
        <div className="definition-bubble" onClick={(e) => { e.stopPropagation(); setDefinitionBubble(null); }}>
          <div className="bubble-content" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setDefinitionBubble(null)}>×</button>
            {definitionBubble.image && (
              <div className="bubble-image">
                <img src={definitionBubble.image} alt={definitionBubble.word} />
              </div>
            )}
            <h3>{definitionBubble.word}</h3>
            {definitionBubble.ministry && <span className="bubble-ministry">{definitionBubble.ministry}</span>}
            {definitionBubble.loading ? (
              <p className="bubble-loading">Buscando definición...</p>
            ) : (
              <>
                <p className="bubble-definition">{definitionBubble.definition}</p>
                <div className="bubble-links">
                  {definitionBubble.wikiUrl && (
                    <a href={definitionBubble.wikiUrl} target="_blank" rel="noopener noreferrer" className="bubble-link">
                      Wikipedia →
                    </a>
                  )}
                  {definitionBubble.searchUrl && (
                    <a href={definitionBubble.searchUrl} target="_blank" rel="noopener noreferrer" className="bubble-link">
                      Buscar más →
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UpperRight
