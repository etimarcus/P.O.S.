/**
 * Upper Right Quadrant - "IT" Exterior Individual
 * Hierarchical Word Cloud for Issues/Topics
 *
 * Mouse controls:
 * - Left click: Open child words
 * - Right click: Add new word at current level
 * - Middle button drag: Pan the canvas
 * - Mouse wheel: Zoom in/out
 * - Back button: Go to parent
 * - Forward button: Go to previous child
 * - Shift + Left click: Activate word for connection
 * - Shift + Right click: Connect word as child of activated word
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import './UpperRight.css'

// Ministry colors for selection
const MINISTRIES = [
  { name: 'Ministerio de Salud', color: '#4CAF50' },
  { name: 'Ministerio de Educación', color: '#2196F3' },
  { name: 'Ministerio de Cultura', color: '#9C27B0' },
  { name: 'Ministerio de Economía', color: '#FF9800' },
  { name: 'Ministerio de Ambiente', color: '#8BC34A' },
  { name: 'Ministerio de Tecnología', color: '#00BCD4' },
  { name: 'Ministerio de Bienestar', color: '#E91E63' },
  { name: 'Sin Ministerio', color: '#9E9E9E' }
]

// Size mapping based on child count
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

  const getWordDims = (word) => {
    const charWidth = { xl: 3.5, lg: 2.8, md: 2.2, sm: 1.8, xs: 1.4 }
    const heights = { xl: 10, lg: 8, md: 7, sm: 6, xs: 5 }
    const cw = charWidth[word.size] || 1.8
    const textLen = word.text?.length || 5
    return {
      w: Math.max(textLen * cw, 8),
      h: heights[word.size] || 6
    }
  }

  const overlaps = (pos1, pos2) => {
    const pad = 2
    return !(pos1.x + pos1.w/2 + pad < pos2.x - pos2.w/2 ||
             pos1.x - pos1.w/2 > pos2.x + pos2.w/2 + pad ||
             pos1.y + pos1.h/2 + pad < pos2.y - pos2.h/2 ||
             pos1.y - pos1.h/2 > pos2.y + pos2.h/2 + pad)
  }

  const hasCollision = (pos) => {
    for (const p of placed) {
      if (overlaps(pos, p)) return true
    }
    return false
  }

  const findPosition = (word) => {
    const dims = getWordDims(word)
    const centerX = 50
    const centerY = 50
    const a = 0
    const b = 1.5

    for (let t = 0; t < 200; t += 0.3) {
      const r = a + b * t
      const x = centerX + r * Math.cos(t)
      const y = centerY + r * Math.sin(t) * 0.6

      if (x < 5 || x > 95 || y < 10 || y > 90) continue

      const newPos = { x, y, w: dims.w, h: dims.h }

      if (!hasCollision(newPos)) {
        placed.push(newPos)
        return { id: word.id, x, y }
      }
    }

    for (let gy = 15; gy <= 85; gy += 8) {
      for (let gx = 10; gx <= 90; gx += 8) {
        const newPos = { x: gx, y: gy, w: dims.w, h: dims.h }
        if (!hasCollision(newPos)) {
          placed.push(newPos)
          return { id: word.id, x: gx, y: gy }
        }
      }
    }

    placed.push({ x: 50, y: 50, w: dims.w, h: dims.h })
    return { id: word.id, x: 50, y: 50 }
  }

  const sorted = [...words].sort((a, b) => {
    const order = { xl: 0, lg: 1, md: 2, sm: 3, xs: 4 }
    return (order[a.size] || 4) - (order[b.size] || 4)
  })

  return sorted.map(word => findPosition(word))
}

export function UpperRight({ onNavigate, onShowInfo, onExpand, expanded }) {
  const [path, setPath] = useState(['root'])
  const [forwardHistory, setForwardHistory] = useState([])
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [wordsMap, setWordsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [definitionBubble, setDefinitionBubble] = useState(null)
  const [addWordBubble, setAddWordBubble] = useState(null)
  const [editWordBubble, setEditWordBubble] = useState(null)
  const [newWordName, setNewWordName] = useState('')
  const [newWordMinistry, setNewWordMinistry] = useState(MINISTRIES[MINISTRIES.length - 1])
  const [activatedWord, setActivatedWord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mouseButtons, setMouseButtons] = useState(0)

  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch words from Supabase
  const fetchWords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('word_cloud')
        .select('*')

      if (error) throw error

      const map = {}

      data.forEach(word => {
        map[String(word.id)] = {
          ...word,
          label: word.word,
          children: []
        }
      })

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

      Object.values(map).forEach(word => {
        word.children.forEach(child => {
          child.size = getSizeFromChildCount(map[child.id]?.children?.length || 0)
        })
      })

      const rootWords = data.filter(word => word.tier === 1)

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
  }, [])

  useEffect(() => {
    fetchWords()
  }, [fetchWords])

  const currentNodeId = path[path.length - 1]
  const currentNode = wordsMap[currentNodeId]
  const currentTopics = currentNode?.children || []

  const wordPositions = useMemo(() => {
    if (currentTopics.length === 0) return {}
    const positions = calculateWordPositions(currentTopics)
    const posMap = {}
    positions.forEach(p => { posMap[p.id] = { x: p.x, y: p.y } })
    return posMap
  }, [currentTopics])

  // Navigate to child
  const navigateToChild = useCallback((topicId) => {
    if (wordsMap[topicId]?.children?.length > 0) {
      setIsTransitioning(true)
      setForwardHistory([])
      setTimeout(() => {
        setPath(prev => [...prev, topicId])
        setIsTransitioning(false)
        setPan({ x: 0, y: 0 })
        setZoom(1)
      }, 150)
    }
  }, [wordsMap])

  // Navigate to parent (back)
  const navigateBack = useCallback(() => {
    if (path.length > 1) {
      setIsTransitioning(true)
      const currentId = path[path.length - 1]
      setTimeout(() => {
        setForwardHistory(prev => [currentId, ...prev])
        setPath(prev => prev.slice(0, -1))
        setIsTransitioning(false)
        setPan({ x: 0, y: 0 })
        setZoom(1)
      }, 150)
    }
  }, [path])

  // Navigate forward
  const navigateForward = useCallback(() => {
    if (forwardHistory.length > 0) {
      setIsTransitioning(true)
      const nextId = forwardHistory[0]
      setTimeout(() => {
        setForwardHistory(prev => prev.slice(1))
        setPath(prev => [...prev, nextId])
        setIsTransitioning(false)
        setPan({ x: 0, y: 0 })
        setZoom(1)
      }, 150)
    }
  }, [forwardHistory])

  // Handle word left click
  const handleWordClick = useCallback(async (e, topic) => {
    e.stopPropagation()
    e.preventDefault()

    // Shift + click: activate word for connection
    if (e.shiftKey) {
      setActivatedWord(prev => prev?.id === topic.id ? null : { id: topic.id, text: topic.text })
      onShowInfo?.(activatedWord?.id === topic.id ? 'Palabra desactivada' : `Palabra activada: ${topic.text}`)
      return
    }

    // Regular click: navigate to children or show definition
    if (wordsMap[topic.id]?.children?.length > 0) {
      navigateToChild(topic.id)
    } else {
      // Leaf node - fetch definition
      const wordData = wordsMap[topic.id]
      setDefinitionBubble({ word: topic.text, loading: true, ministry: wordData?.ministry_name })

      try {
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
  }, [wordsMap, navigateToChild, activatedWord, onShowInfo])

  // Handle word mouse down - track for both-button edit
  const handleWordMouseDown = useCallback((e, topic) => {
    // Track buttons pressed
    setMouseButtons(e.buttons)

    // Both buttons pressed (left=1 + right=2 = 3)
    if (e.buttons === 3) {
      e.preventDefault()
      e.stopPropagation()

      // Open edit bubble for this word
      const wordData = wordsMap[topic.id]
      const ministry = MINISTRIES.find(m => m.name === wordData?.ministry_name) || MINISTRIES[MINISTRIES.length - 1]

      setEditWordBubble({
        id: topic.id,
        originalText: topic.text
      })
      setNewWordName(topic.text)
      setNewWordMinistry(ministry)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [wordsMap])

  // Handle word right click - connect to activated word
  const handleWordContextMenu = useCallback(async (e, topic) => {
    e.preventDefault()
    e.stopPropagation()

    // If both buttons were pressed, don't do anything (edit mode)
    if (mouseButtons === 3) {
      setMouseButtons(0)
      return
    }

    // Shift + right click: connect to activated word
    if (e.shiftKey && activatedWord && activatedWord.id !== topic.id) {
      setSaving(true)
      try {
        // Update the clicked word's parent_id to the activated word's id
        const { error } = await supabase
          .from('word_cloud')
          .update({ parent_id: parseInt(activatedWord.id) })
          .eq('id', parseInt(topic.id))

        if (error) throw error

        onShowInfo?.(`"${topic.text}" conectado como hijo de "${activatedWord.text}"`)
        setActivatedWord(null)
        await fetchWords()
      } catch (err) {
        console.error('Error connecting words:', err)
        onShowInfo?.(`Error: ${err.message}`)
      }
      setSaving(false)
    }
    // Regular right-click on word does nothing (prevents bubble opening)
  }, [activatedWord, fetchWords, onShowInfo, mouseButtons])

  // Handle container right click - add new word
  const handleContainerContextMenu = useCallback((e) => {
    // Don't open if clicking on a word or if other mouse buttons are pressed
    if (e.target.closest('.word-item')) {
      e.preventDefault()
      return
    }

    // Check if multiple buttons are pressed (both left and right)
    if (e.buttons > 2) {
      e.preventDefault()
      return
    }

    e.preventDefault()
    e.stopPropagation()

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setAddWordBubble({ x, y })
      setNewWordName('')
      setNewWordMinistry(MINISTRIES[MINISTRIES.length - 1])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [])

  // Save new word
  const handleSaveNewWord = useCallback(async () => {
    if (!newWordName.trim()) return

    setSaving(true)
    try {
      const currentParentId = currentNodeId === 'root' ? null : parseInt(currentNodeId)
      const tier = currentNodeId === 'root' ? 1 : (wordsMap[currentNodeId]?.tier || 1) + 1

      const insertData = {
        word: newWordName.trim(),
        parent_id: currentParentId,
        tier: tier,
        ministry_name: newWordMinistry.name,
        ministry_color: newWordMinistry.color
      }

      const { error } = await supabase
        .from('word_cloud')
        .insert(insertData)

      if (error) throw error

      onShowInfo?.(`Palabra "${newWordName}" agregada`)
      setAddWordBubble(null)
      setNewWordName('')
      await fetchWords()
    } catch (err) {
      console.error('Error saving word:', err)
      onShowInfo?.(`Error: ${err.message}`)
    }
    setSaving(false)
  }, [newWordName, newWordMinistry, currentNodeId, wordsMap, fetchWords, onShowInfo])

  // Save edited word
  const handleSaveEditWord = useCallback(async () => {
    if (!newWordName.trim() || !editWordBubble) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('word_cloud')
        .update({
          word: newWordName.trim(),
          ministry_name: newWordMinistry.name,
          ministry_color: newWordMinistry.color
        })
        .eq('id', parseInt(editWordBubble.id))

      if (error) throw error

      onShowInfo?.(`Palabra actualizada`)
      setEditWordBubble(null)
      setNewWordName('')
      await fetchWords()
    } catch (err) {
      console.error('Error updating word:', err)
      onShowInfo?.(`Error: ${err.message}`)
    }
    setSaving(false)
  }, [newWordName, newWordMinistry, editWordBubble, fetchWords, onShowInfo])

  // Delete word
  const handleDeleteWord = useCallback(async () => {
    if (!editWordBubble) return

    if (!confirm(`¿Eliminar "${editWordBubble.originalText}"?`)) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('word_cloud')
        .delete()
        .eq('id', parseInt(editWordBubble.id))

      if (error) throw error

      onShowInfo?.(`Palabra eliminada`)
      setEditWordBubble(null)
      setNewWordName('')
      await fetchWords()
    } catch (err) {
      console.error('Error deleting word:', err)
      onShowInfo?.(`Error: ${err.message}`)
    }
    setSaving(false)
  }, [editWordBubble, fetchWords, onShowInfo])

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback((e, index) => {
    e.stopPropagation()
    if (index < path.length - 1) {
      setIsTransitioning(true)
      const removedPath = path.slice(index + 1)
      setTimeout(() => {
        setForwardHistory(removedPath)
        setPath(prev => prev.slice(0, index + 1))
        setIsTransitioning(false)
        setPan({ x: 0, y: 0 })
        setZoom(1)
      }, 150)
    }
  }, [path])

  // Handle quadrant click - do nothing on background
  const handleQuadrantClick = useCallback((e) => {
    // Background clicks do nothing - use mouse back button or breadcrumbs to navigate
  }, [])

  // Handle header click
  const handleHeaderClick = (e) => {
    e.stopPropagation()
    if (onExpand && !expanded) {
      onExpand()
    }
  }

  // Mouse button events (back/forward)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e) => {
      // Back button (button 3)
      if (e.button === 3) {
        e.preventDefault()
        navigateBack()
      }
      // Forward button (button 4)
      else if (e.button === 4) {
        e.preventDefault()
        navigateForward()
      }
      // Middle button (button 1) - start panning
      else if (e.button === 1) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      }
    }

    const handleMouseMove = (e) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        })
      }
    }

    const handleMouseUp = (e) => {
      if (e.button === 1) {
        setIsPanning(false)
      }
    }

    // Prevent context menu on back/forward buttons
    const handleContextMenuCapture = (e) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault()
      }
    }

    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', () => setIsPanning(false))
    container.addEventListener('contextmenu', handleContextMenuCapture, true)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mouseleave', () => setIsPanning(false))
      container.removeEventListener('contextmenu', handleContextMenuCapture, true)
    }
  }, [navigateBack, navigateForward, isPanning, pan, panStart])

  // Wheel zoom
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDefinitionBubble(null)
        setAddWordBubble(null)
        setEditWordBubble(null)
        setActivatedWord(null)
      }
      if (e.key === 'Enter' && addWordBubble) {
        handleSaveNewWord()
      }
      if (e.key === 'Enter' && editWordBubble) {
        handleSaveEditWord()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addWordBubble, editWordBubble, handleSaveNewWord, handleSaveEditWord])

  // Reset view when navigating
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [path])

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

        {activatedWord && (
          <div className="activated-word-indicator">
            Conectando a: <strong>{activatedWord.text}</strong>
            <button onClick={() => setActivatedWord(null)}>×</button>
          </div>
        )}

        <div
          ref={containerRef}
          className={`wordcloud-container ${isTransitioning ? 'transitioning' : ''} ${isPanning ? 'panning' : ''}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: isPanning ? 'grabbing' : 'default'
          }}
          onContextMenu={handleContainerContextMenu}
        >
          {currentTopics.map((topic, i) => {
            const hasChildren = wordsMap[topic.id]?.children?.length > 0
            const pos = wordPositions[topic.id] || { x: 50, y: 50 }
            const isActivated = activatedWord?.id === topic.id
            return (
              <span
                key={topic.id}
                className={`word-item word-${topic.size} ${hasChildren ? 'has-children' : ''} ${isActivated ? 'activated' : ''}`}
                onClick={(e) => handleWordClick(e, topic)}
                onMouseDown={(e) => handleWordMouseDown(e, topic)}
                onContextMenu={(e) => handleWordContextMenu(e, topic)}
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
            ← click o botón atrás para volver
          </div>
        )}

        <div className="controls-hint">
          <span>🖱️ Rueda: zoom</span>
          <span>⚙️ Medio: arrastrar</span>
          <span>➕ Derecho: agregar</span>
        </div>
      </div>

      <span className="click-hint">
        {path.length > 1 ? 'Click para volver' : 'Click palabra para explorar →'}
      </span>

      {/* Definition bubble */}
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

      {/* Add word bubble */}
      {addWordBubble && (
        <div className="definition-bubble" onClick={(e) => { e.stopPropagation(); setAddWordBubble(null); }}>
          <div className="bubble-content add-word-bubble" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setAddWordBubble(null)}>×</button>
            <h3>Nueva Palabra</h3>
            <p className="bubble-subtitle">en "{wordsMap[currentNodeId]?.label || 'topics'}"</p>

            <div className="form-group">
              <label>Nombre</label>
              <input
                ref={inputRef}
                type="text"
                value={newWordName}
                onChange={(e) => setNewWordName(e.target.value)}
                placeholder="Escribe el nombre..."
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Ministerio</label>
              <div className="ministry-selector">
                {MINISTRIES.map((ministry) => (
                  <button
                    key={ministry.name}
                    className={`ministry-option ${newWordMinistry.name === ministry.name ? 'selected' : ''}`}
                    style={{ '--ministry-color': ministry.color }}
                    onClick={() => setNewWordMinistry(ministry)}
                    disabled={saving}
                  >
                    <span className="ministry-dot" />
                    {ministry.name.replace('Ministerio de ', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setAddWordBubble(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSaveNewWord} disabled={saving || !newWordName.trim()}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit word bubble */}
      {editWordBubble && (
        <div className="definition-bubble" onClick={(e) => { e.stopPropagation(); setEditWordBubble(null); }}>
          <div className="bubble-content add-word-bubble" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setEditWordBubble(null)}>×</button>
            <h3>Editar Palabra</h3>
            <p className="bubble-subtitle">"{editWordBubble.originalText}"</p>

            <div className="form-group">
              <label>Nombre</label>
              <input
                ref={inputRef}
                type="text"
                value={newWordName}
                onChange={(e) => setNewWordName(e.target.value)}
                placeholder="Escribe el nombre..."
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Ministerio</label>
              <div className="ministry-selector">
                {MINISTRIES.map((ministry) => (
                  <button
                    key={ministry.name}
                    className={`ministry-option ${newWordMinistry.name === ministry.name ? 'selected' : ''}`}
                    style={{ '--ministry-color': ministry.color }}
                    onClick={() => setNewWordMinistry(ministry)}
                    disabled={saving}
                  >
                    <span className="ministry-dot" />
                    {ministry.name.replace('Ministerio de ', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-delete" onClick={handleDeleteWord} disabled={saving}>
                Eliminar
              </button>
              <button className="btn-cancel" onClick={() => setEditWordBubble(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSaveEditWord} disabled={saving || !newWordName.trim()}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UpperRight
