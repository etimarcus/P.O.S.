/**
 * Upper Right Quadrant - "IT" Exterior Individual
 * Hierarchical Word Cloud for Issues/Topics
 *
 * Mouse controls:
 * - Left click: Open child words
 * - Right click: Add new word at current level
 * - Right click on definition bubble: Add child word
 * - Both buttons on word: Edit/delete word
 * - Middle button drag: Pan the canvas
 * - Mouse wheel: Zoom in/out (pointer-centered)
 *   - Zoom out past threshold: Navigate to parent
 *   - Zoom in on word with children: Navigate into word
 * - Back button: Go to parent
 * - Forward button: Go to previous child
 * - Shift + Left click: Activate word for connection
 * - Shift + Right click: Connect word as child of activated word
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import './UpperRight.css'

// Default ministry (fallback) - will be populated dynamically from tier 1 words
const DEFAULT_MINISTRY = { name: 'Uncategorized', color: '#9E9E9E' }

// Calculate positions ensuring no overlap, clustered around center
const calculateWordPositions = (words) => {
  const placed = []

  const getWordDims = (word) => {
    const charWidth = 2.6
    const height = 6
    const textLen = word.text?.length || 5
    return {
      w: Math.max(textLen * charWidth, 8),
      h: height
    }
  }

  const overlaps = (pos1, pos2) => {
    const pad = 2.5
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
    const centerX = 45
    const centerY = 45
    const a = 0
    const b = 1.5

    // Account for word width - words are centered, so half extends each direction
    const minX = 5 + dims.w / 2
    const maxX = 95 - dims.w / 2

    for (let t = 0; t < 200; t += 0.3) {
      const r = a + b * t
      const x = centerX + r * Math.cos(t)
      const y = centerY + r * Math.sin(t) * 0.6

      if (x < minX || x > maxX || y < 10 || y > 90) continue

      const newPos = { x, y, w: dims.w, h: dims.h }

      if (!hasCollision(newPos)) {
        placed.push(newPos)
        return { id: word.id, x, y }
      }
    }

    for (let gy = 15; gy <= 85; gy += 8) {
      for (let gx = Math.max(10, minX); gx <= Math.min(90, maxX); gx += 8) {
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

  // Place words in order (no size-based sorting needed)
  return words.map(word => findPosition(word))
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
  const [addWordParent, setAddWordParent] = useState(null) // For creating child of specific word
  const [editWordBubble, setEditWordBubble] = useState(null)
  const [newWordName, setNewWordName] = useState('')
  const [newWordMinistry, setNewWordMinistry] = useState(DEFAULT_MINISTRY)
  const [ministries, setMinistries] = useState([DEFAULT_MINISTRY])
  const [activatedWord, setActivatedWord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mouseButtons, setMouseButtons] = useState(0)
  const [hoveredWord, setHoveredWord] = useState(null)

  const wrapperRef = useRef(null)  // For mouse position (untransformed)
  const containerRef = useRef(null)  // For the transformed content
  const inputRef = useRef(null)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const isNavigatingRef = useRef(false)

  // Keep refs in sync with state
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])

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
              color: word.ministry_color
            })
          }
        }
      })

      const rootWords = data.filter(word => word.tier === 1)

      // Build ministries from tier 1 words
      const ministriesFromWords = rootWords.map(word => ({
        name: word.word,
        color: word.ministry_color || '#9E9E9E'
      }))
      // Add default "Uncategorized" at the end
      ministriesFromWords.push(DEFAULT_MINISTRY)
      setMinistries(ministriesFromWords)

      map['root'] = {
        label: 'topics',
        children: rootWords.map(word => ({
          id: String(word.id),
          text: word.word,
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

  // Fetch issues for a word
  const fetchIssuesForWord = useCallback(async (word) => {
    try {
      const { data, error } = await supabase
        .from('issue_words')
        .select('issue_id, relevance_level, issues(*)')
        .ilike('word', word)

      if (error) throw error

      // Filter out resolved/archived issues and sort by urgency
      const activeIssues = (data || [])
        .filter(iw => iw.issues && !['resolved', 'archived'].includes(iw.issues.status))
        .map(iw => ({ ...iw.issues, relevance: iw.relevance_level }))
        .sort((a, b) => b.urgency_level - a.urgency_level)

      return activeIssues
    } catch (err) {
      console.error('Error fetching issues:', err)
      // Return sample data for demo
      const sampleIssues = {
        'democracy': [
          { id: '1', title: 'Representación vs Participación Directa', description: 'Debate sobre el balance entre democracia representativa y participativa', status: 'deliberating', urgency_level: 4 },
          { id: '2', title: 'Voto Electrónico', description: 'Seguridad y transparencia en sistemas de votación digital', status: 'open', urgency_level: 3 }
        ],
        'economy': [
          { id: '3', title: 'Distribución de Recursos', description: 'Criterios para asignación equitativa de recursos comunitarios', status: 'open', urgency_level: 5 }
        ],
        'education': [
          { id: '4', title: 'Acceso Universal', description: 'Garantizar educación de calidad para todos los miembros', status: 'deliberating', urgency_level: 4 }
        ],
        'farm-loans': [
          { id: '5', title: 'Criterios para Préstamos Agrícolas', description: '¿Bajo qué condiciones la comunidad debe otorgar préstamos a proyectos agrícolas? Tasas, plazos, garantías y priorización.', status: 'deliberating', urgency_level: 4 },
          { id: '6', title: 'Gestión del Riesgo en Préstamos', description: '¿Cómo manejar el riesgo de impago considerando factores climáticos y de mercado?', status: 'open', urgency_level: 3 },
          { id: '7', title: 'Requisitos Ambientales', description: '¿Deben los préstamos condicionarse a prácticas sustentables? Orgánico vs. convencional.', status: 'open', urgency_level: 3 }
        ],
        'agriculture': [
          { id: '5', title: 'Criterios para Préstamos Agrícolas', description: '¿Bajo qué condiciones la comunidad debe otorgar préstamos a proyectos agrícolas?', status: 'deliberating', urgency_level: 4 }
        ],
        'sustainability': [
          { id: '7', title: 'Requisitos Ambientales para Financiamiento', description: '¿Deben los préstamos agrícolas condicionarse a prácticas sustentables?', status: 'open', urgency_level: 3 }
        ]
      }
      return sampleIssues[word.toLowerCase()] || []
    }
  }, [])

  // Handle word left click
  const handleWordClick = useCallback(async (e, topic) => {
    e.stopPropagation()
    e.preventDefault()

    // Shift + click: activate word for connection
    if (e.shiftKey) {
      setActivatedWord(prev => prev?.id === topic.id ? null : { id: topic.id, text: topic.text })
      onShowInfo?.(activatedWord?.id === topic.id ? 'Word deactivated' : `Word activated: ${topic.text}`)
      return
    }

    // Regular click: navigate to children or show definition
    if (wordsMap[topic.id]?.children?.length > 0) {
      navigateToChild(topic.id)
    } else {
      // Leaf node - fetch definition and issues
      const wordData = wordsMap[topic.id]
      setDefinitionBubble({ word: topic.text, loading: true, ministry: wordData?.ministry_name, wordId: topic.id })

      // Fetch issues in parallel with definition
      const issuesPromise = fetchIssuesForWord(topic.text)

      try {
        const searchTerm = topic.text.replace(/-/g, ' ')
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`
        const response = await fetch(wikiUrl)

        const issues = await issuesPromise

        if (response.ok) {
          const data = await response.json()
          setDefinitionBubble({
            word: topic.text,
            wordId: topic.id,
            definition: data.extract || 'No definition found',
            ministry: wordData?.ministry_name,
            image: data.thumbnail?.source || null,
            wikiUrl: data.content_urls?.desktop?.page || null,
            issues
          })
        } else {
          const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${searchTerm}`)
          if (dictResponse.ok) {
            const dictData = await dictResponse.json()
            const definition = dictData[0]?.meanings[0]?.definitions[0]?.definition || 'No definition found'
            setDefinitionBubble({
              word: topic.text,
              wordId: topic.id,
              definition,
              ministry: wordData?.ministry_name,
              searchUrl: `https://www.google.com/search?q=${encodeURIComponent(topic.text)}&tbm=isch`,
              issues
            })
          } else {
            throw new Error('Not found')
          }
        }
      } catch (err) {
        const issues = await issuesPromise
        setDefinitionBubble({
          word: topic.text,
          wordId: topic.id,
          definition: wordData?.description || `Topic related to ${wordData?.ministry_name || 'this project'}`,
          ministry: wordData?.ministry_name,
          searchUrl: `https://www.google.com/search?q=${encodeURIComponent(topic.text)}`,
          issues
        })
      }
    }
  }, [wordsMap, navigateToChild, activatedWord, onShowInfo, fetchIssuesForWord])

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
      const ministry = ministries.find(m => m.name === wordData?.ministry_name) || ministries[ministries.length - 1] || DEFAULT_MINISTRY

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

    // Shift + right click: make activated word a child of clicked word
    if (e.shiftKey && activatedWord && activatedWord.id !== topic.id) {
      setSaving(true)
      try {
        // Update the activated word's parent_id to the clicked word's id
        const { error } = await supabase
          .from('word_cloud')
          .update({ parent_id: parseInt(topic.id) })
          .eq('id', parseInt(activatedWord.id))

        if (error) throw error

        onShowInfo?.(`"${activatedWord.text}" moved into "${topic.text}"`)
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
      setNewWordMinistry(ministries[ministries.length - 1] || DEFAULT_MINISTRY)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [])

  // Save new word
  const handleSaveNewWord = useCallback(async () => {
    if (!newWordName.trim()) return

    setSaving(true)
    try {
      // Use addWordParent if set (creating child of specific word), otherwise use current node
      const parentId = addWordParent
        ? parseInt(addWordParent.id)
        : (currentNodeId === 'root' ? null : parseInt(currentNodeId))

      const parentTier = addWordParent
        ? (wordsMap[addWordParent.id]?.tier || 1)
        : (currentNodeId === 'root' ? 0 : (wordsMap[currentNodeId]?.tier || 1))

      const tier = parentTier + 1

      const insertData = {
        word: newWordName.trim(),
        parent_id: parentId,
        tier: tier,
        ministry_name: newWordMinistry.name,
        ministry_color: newWordMinistry.color
      }

      const { error } = await supabase
        .from('word_cloud')
        .insert(insertData)

      if (error) throw error

      onShowInfo?.(`Word "${newWordName}" added`)
      setAddWordBubble(null)
      setAddWordParent(null)
      setNewWordName('')
      await fetchWords()
    } catch (err) {
      console.error('Error saving word:', err)
      onShowInfo?.(`Error: ${err.message}`)
    }
    setSaving(false)
  }, [newWordName, newWordMinistry, currentNodeId, addWordParent, wordsMap, fetchWords, onShowInfo])

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

      onShowInfo?.(`Word updated`)
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

    if (!confirm(`Delete "${editWordBubble.originalText}"?`)) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('word_cloud')
        .delete()
        .eq('id', parseInt(editWordBubble.id))

      if (error) throw error

      onShowInfo?.(`Word deleted`)
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

  // Mouse button events (back/forward/pan)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

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
      // Left button (button 0) - start panning if not on a word
      else if (e.button === 0 && !e.target.closest('.word-item')) {
        e.preventDefault()
        isPanningRef.current = true
        setIsPanning(true)
        panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y }
      }
    }

    const handleMouseMove = (e) => {
      if (isPanningRef.current) {
        const newPan = {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y
        }
        panRef.current = newPan
        setPan(newPan)
      }
    }

    const handleMouseUp = (e) => {
      if (e.button === 0) {
        isPanningRef.current = false
        setIsPanning(false)
      }
    }

    const handleMouseLeave = () => {
      isPanningRef.current = false
      setIsPanning(false)
    }

    // Prevent context menu on back/forward buttons
    const handleContextMenuCapture = (e) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault()
      }
    }

    wrapper.addEventListener('mousedown', handleMouseDown)
    wrapper.addEventListener('mousemove', handleMouseMove)
    wrapper.addEventListener('mouseup', handleMouseUp)
    wrapper.addEventListener('mouseleave', handleMouseLeave)
    wrapper.addEventListener('contextmenu', handleContextMenuCapture, true)

    return () => {
      wrapper.removeEventListener('mousedown', handleMouseDown)
      wrapper.removeEventListener('mousemove', handleMouseMove)
      wrapper.removeEventListener('mouseup', handleMouseUp)
      wrapper.removeEventListener('mouseleave', handleMouseLeave)
      wrapper.removeEventListener('contextmenu', handleContextMenuCapture, true)
    }
  }, [navigateBack, navigateForward])

  // Wheel zoom - pointer-centered, zoom out to go back, zoom in on word to navigate
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleWheel = (e) => {
      e.preventDefault()

      // Prevent multiple rapid navigations
      if (isNavigatingRef.current) return

      const delta = e.deltaY > 0 ? -0.15 : 0.15
      const zoomIn = delta > 0

      // Get mouse position relative to wrapper (untransformed container)
      const rect = wrapper.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Get current values from refs
      const currentZoom = zoomRef.current
      const currentPan = panRef.current

      // Calculate new zoom
      let newZoom = Math.min(Math.max(currentZoom + delta, 0.5), 3)

      // Zoom out past threshold - navigate back to parent
      if (!zoomIn && currentZoom <= 0.7 && path.length > 1) {
        isNavigatingRef.current = true
        navigateBack()
        setTimeout(() => {
          isNavigatingRef.current = false
        }, 300)
        return
      }

      // Zoom in past threshold while hovering over a word with children - navigate into it
      if (zoomIn && currentZoom >= 1.5 && hoveredWord) {
        const hasChildren = wordsMap[hoveredWord.id]?.children?.length > 0
        if (hasChildren) {
          isNavigatingRef.current = true
          navigateToChild(hoveredWord.id)
          setTimeout(() => {
            isNavigatingRef.current = false
          }, 300)
          return
        }
      }

      // Pointer-centered zoom: adjust pan so point under cursor stays in place
      // Formula: newPan = mousePos - (mousePos - oldPan) * (newZoom / oldZoom)
      const zoomRatio = newZoom / currentZoom
      const newPanX = mouseX - (mouseX - currentPan.x) * zoomRatio
      const newPanY = mouseY - (mouseY - currentPan.y) * zoomRatio

      // Update both state values
      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
    }

    wrapper.addEventListener('wheel', handleWheel, { passive: false })
    return () => wrapper.removeEventListener('wheel', handleWheel)
  }, [path.length, navigateBack, hoveredWord, wordsMap, navigateToChild])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // First priority: close any open dialogs/bubbles
        if (definitionBubble || addWordBubble || editWordBubble || activatedWord) {
          setDefinitionBubble(null)
          setAddWordBubble(null)
          setAddWordParent(null)
          setEditWordBubble(null)
          setActivatedWord(null)
        }
        // Second priority: go back to root (tier 1)
        else if (path.length > 1) {
          setIsTransitioning(true)
          setTimeout(() => {
            setPath(['root'])
            setForwardHistory([])
            setIsTransitioning(false)
            setPan({ x: 0, y: 0 })
            setZoom(1)
          }, 150)
        }
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
  }, [addWordBubble, editWordBubble, definitionBubble, activatedWord, path, handleSaveNewWord, handleSaveEditWord])

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
        <span className="quadrant-label" onClick={(e) => { e.stopPropagation(); onExpand?.(); }}>IT</span>
        <div className="quadrant-content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="quadrant quadrant-ur">
        <span className="quadrant-label" onClick={(e) => { e.stopPropagation(); onExpand?.(); }}>IT</span>
        <div className="quadrant-content">
          <div className="error">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`quadrant quadrant-ur ${expanded ? 'expanded' : ''}`} onClick={handleQuadrantClick}>
      <span className="quadrant-label" onClick={(e) => { e.stopPropagation(); onExpand?.(); }}>IT</span>

      <div className="quadrant-content">
        {path.length > 1 && (
          <div className="breadcrumb">
            <span className="breadcrumb-back" onClick={(e) => { e.stopPropagation(); navigateBack(); }} title="Go back one level">
              «
            </span>
            {breadcrumbLabels.slice(1).map((label, i) => {
              const isActive = i + 1 === breadcrumbLabels.length - 1
              const nodeId = path[i + 1]
              return (
                <span key={i + 1}>
                  {i > 0 && <span className="breadcrumb-separator"> / </span>}
                  <span
                    className={`breadcrumb-item ${isActive ? 'active editable' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isActive && nodeId !== 'root') {
                        // Click on active breadcrumb opens edit dialog
                        const wordData = wordsMap[nodeId]
                        const ministry = ministries.find(m => m.name === wordData?.ministry_name) || ministries[ministries.length - 1] || DEFAULT_MINISTRY
                        setEditWordBubble({
                          id: nodeId,
                          originalText: label
                        })
                        setNewWordName(label)
                        setNewWordMinistry(ministry)
                        setTimeout(() => inputRef.current?.focus(), 100)
                      } else {
                        handleBreadcrumbClick(e, i + 1)
                      }
                    }}
                    title={isActive ? 'Click to edit' : 'Click to navigate'}
                  >
                    {label}
                    {isActive && <span className="edit-hint">✎</span>}
                  </span>
                </span>
              )
            })}
          </div>
        )}

        {activatedWord && (
          <div className="activated-word-indicator">
            Connecting to: <strong>{activatedWord.text}</strong>
            <button onClick={() => setActivatedWord(null)}>×</button>
          </div>
        )}

        <div
          ref={wrapperRef}
          className="wordcloud-wrapper"
          onContextMenu={handleContainerContextMenu}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          <div
            ref={containerRef}
            className={`wordcloud-container ${isTransitioning ? 'transitioning' : ''} ${isPanning ? 'panning' : ''}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {currentTopics.map((topic, i) => {
              const hasChildren = wordsMap[topic.id]?.children?.length > 0
              const pos = wordPositions[topic.id] || { x: 50, y: 50 }
              const isActivated = activatedWord?.id === topic.id
              const isHovered = hoveredWord?.id === topic.id
              return (
                <span
                  key={topic.id}
                  className={`word-item ${hasChildren ? 'has-children' : ''} ${isActivated ? 'activated' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={(e) => handleWordClick(e, topic)}
                  onMouseDown={(e) => handleWordMouseDown(e, topic)}
                  onContextMenu={(e) => handleWordContextMenu(e, topic)}
                  onMouseEnter={() => setHoveredWord({ id: topic.id, text: topic.text })}
                  onMouseLeave={() => setHoveredWord(null)}
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
        </div>

      </div>

      {/* Definition bubble */}
      {definitionBubble && (
        <div className="definition-bubble" onClick={(e) => { e.stopPropagation(); setDefinitionBubble(null); }} onContextMenu={(e) => e.preventDefault()}>
          <div className={`bubble-content ${definitionBubble.issues?.length > 0 ? 'has-issues' : ''}`} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            // Right-click on definition bubble opens add word as child
            setAddWordParent({ id: definitionBubble.wordId, text: definitionBubble.word })
            setAddWordBubble({ x: 50, y: 50 })
            setNewWordName('')
            setNewWordMinistry(ministries[ministries.length - 1] || DEFAULT_MINISTRY)
            setDefinitionBubble(null)
            setTimeout(() => inputRef.current?.focus(), 100)
          }}>
            <button className="bubble-close" onClick={() => setDefinitionBubble(null)}>×</button>
            <button
              className="bubble-edit"
              onClick={() => {
                const wordData = wordsMap[definitionBubble.wordId]
                const ministry = ministries.find(m => m.name === wordData?.ministry_name) || ministries[ministries.length - 1] || DEFAULT_MINISTRY
                setEditWordBubble({
                  id: definitionBubble.wordId,
                  originalText: definitionBubble.word
                })
                setNewWordName(definitionBubble.word)
                setNewWordMinistry(ministry)
                setDefinitionBubble(null)
                setTimeout(() => inputRef.current?.focus(), 100)
              }}
              title="Edit word"
            >
              ✎
            </button>

            <div className="bubble-main">
              {definitionBubble.image && (
                <div className="bubble-image">
                  <img src={definitionBubble.image} alt={definitionBubble.word} />
                </div>
              )}
              <h3>{definitionBubble.word}</h3>
              {definitionBubble.ministry && <span className="bubble-ministry">{definitionBubble.ministry}</span>}
              {definitionBubble.loading ? (
                <p className="bubble-loading">Searching definition...</p>
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
                        Search more →
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Issues sidebar */}
            {definitionBubble.issues?.length > 0 && (
              <div className="bubble-issues">
                <div className="issues-header">
                  <span className="issues-icon">⚡</span>
                  <span className="issues-title">Related Issues</span>
                </div>
                <div className="issues-list">
                  {definitionBubble.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`issue-item issue-${issue.status}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Navigate to crowd reasoning module
                        onShowInfo?.(`Opening deliberation: ${issue.title}`)
                        onNavigate?.('crowdreasoning', { issueId: issue.id })
                      }}
                    >
                      <div className="issue-status-indicator" data-status={issue.status} />
                      <div className="issue-content">
                        <span className="issue-title">{issue.title}</span>
                        <span className="issue-description">{issue.description}</span>
                        <span className="issue-status-label">
                          {issue.status === 'open' && 'Open'}
                          {issue.status === 'deliberating' && 'Deliberating'}
                          {issue.status === 'ready_to_vote' && 'Ready to vote'}
                          {issue.status === 'voting' && 'Voting'}
                        </span>
                      </div>
                      <span className="issue-arrow">→</span>
                    </div>
                  ))}
                </div>
                <p className="issues-note">
                  Click an issue to open the argument map
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add word bubble */}
      {addWordBubble && (
        <div className="definition-bubble" onClick={(e) => { e.stopPropagation(); setAddWordBubble(null); }} onContextMenu={(e) => e.preventDefault()}>
          <div className="bubble-content add-word-bubble" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => { setAddWordBubble(null); setAddWordParent(null); }}>×</button>
            <h3>New Word</h3>
            <p className="bubble-subtitle">
              {addWordParent
                ? `child of "${addWordParent.text}"`
                : `en "${wordsMap[currentNodeId]?.label || 'topics'}"`
              }
            </p>

            <div className="form-group">
              <label>Name</label>
              <input
                ref={inputRef}
                type="text"
                value={newWordName}
                onChange={(e) => setNewWordName(e.target.value)}
                placeholder="Enter name..."
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <div className="ministry-selector">
                {ministries.map((ministry) => (
                  <button
                    key={ministry.name}
                    className={`ministry-option ${newWordMinistry.name === ministry.name ? 'selected' : ''}`}
                    style={{ '--ministry-color': ministry.color }}
                    onClick={() => setNewWordMinistry(ministry)}
                    disabled={saving}
                  >
                    <span className="ministry-dot" />
                    {ministry.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-cancel" onClick={() => { setAddWordBubble(null); setAddWordParent(null); }} disabled={saving}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveNewWord} disabled={saving || !newWordName.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit word bubble */}
      {editWordBubble && (
        <div className="definition-bubble" onClick={(e) => { e.stopPropagation(); setEditWordBubble(null); }} onContextMenu={(e) => e.preventDefault()}>
          <div className="bubble-content add-word-bubble" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setEditWordBubble(null)}>×</button>
            <h3>Edit Word</h3>
            <p className="bubble-subtitle">"{editWordBubble.originalText}"</p>

            <div className="form-group">
              <label>Name</label>
              <input
                ref={inputRef}
                type="text"
                value={newWordName}
                onChange={(e) => setNewWordName(e.target.value)}
                placeholder="Enter name..."
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <div className="ministry-selector">
                {ministries.map((ministry) => (
                  <button
                    key={ministry.name}
                    className={`ministry-option ${newWordMinistry.name === ministry.name ? 'selected' : ''}`}
                    style={{ '--ministry-color': ministry.color }}
                    onClick={() => setNewWordMinistry(ministry)}
                    disabled={saving}
                  >
                    <span className="ministry-dot" />
                    {ministry.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-delete" onClick={handleDeleteWord} disabled={saving}>
                Delete
              </button>
              <button className="btn-cancel" onClick={() => setEditWordBubble(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveEditWord} disabled={saving || !newWordName.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UpperRight
