/**
 * Upper Left Quadrant - "I" Interior Individual
 * Vitruvian Man with Identity Layers (Bio/Health, Credentials/Skills, Peer Perception)
 *
 * Data stored in Supabase "beings" table
 *
 * LAYER PERMISSIONS:
 * - Perception: READ-ONLY (others leave these perceptions about you)
 * - Skills: CREATE desires to learn, EDIT/DELETE own items
 * - Health: CREATE only, requires MEDICAL validation. Can attach files.
 *           Only medical professionals can edit/delete health items.
 *
 * Mouse controls:
 * - Mouse wheel: Switch between layers
 * - Middle button drag: Pan the canvas
 * - Left click on item: Show details
 * - Right click: Add new item (skills/health only)
 * - Both buttons on item: Edit (skills only) / View details (health)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import './UpperLeft.css'

// Value colors (1-5 scale: green = mild/low, red = severe/high)
const getValueColor = (value) => {
  const colors = [
    '#4CAF50', // 1 - green
    '#8BC34A', // 2 - light green
    '#FFC107', // 3 - yellow/amber
    '#FF5722', // 4 - orange/red
    '#E91E63'  // 5 - red/pink
  ]
  return colors[Math.min(Math.max(value - 1, 0), 4)]
}

// Layer order: perception (0) -> skills (1) -> health (2)
const LAYERS = ['perception', 'skills', 'health']

const LAYER_INFO = {
  health: {
    label: 'Corpus',
    color: '#4CAF50',
    icon: '',
    index: 2,
    canCreate: true,
    canEdit: false, // Only medical professionals
    canDelete: false,
    description: 'Condiciones físicas. Requiere validación médica.'
  },
  skills: {
    label: 'Facultates',
    color: '#42a5f5',
    icon: '',
    index: 1,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    description: 'Habilidades y conocimientos que deseas adquirir.'
  },
  perception: {
    label: 'Fama',
    color: '#ffffff',
    icon: '',
    index: 0,
    canCreate: false, // Others add these
    canEdit: false,
    canDelete: false,
    description: 'Percepciones que otros han dejado sobre ti.'
  }
}

// Temporary: mock user ID until auth is implemented
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

export function UpperLeft({ onNavigate, onShowInfo, onExpand, expanded, userId, isMedicalProfessional = false }) {
  const currentUserId = userId || MOCK_USER_ID

  const [currentLayerIndex, setCurrentLayerIndex] = useState(2) // Start at health (Corpus)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Data from Supabase
  const [beings, setBeings] = useState([])
  const [attachments, setAttachments] = useState({}) // { beingId: [attachments] }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // UI state
  const [selectedItem, setSelectedItem] = useState(null)
  const [addItemBubble, setAddItemBubble] = useState(null)
  const [editItemBubble, setEditItemBubble] = useState(null)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [mouseButtons, setMouseButtons] = useState(0)
  const [contactsList, setContactsList] = useState(null)

  // Form state
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newItemValue, setNewItemValue] = useState(3)
  const [newItemDescription, setNewItemDescription] = useState('')

  const quadrantRef = useRef(null)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const panRef = useRef(pan)
  const wheelAccumulator = useRef(0)

  // Keep refs in sync with state
  useEffect(() => { panRef.current = pan }, [pan])

  const currentLayer = LAYERS[currentLayerIndex]
  const layerInfo = LAYER_INFO[currentLayer]

  // Check if current user can edit/delete in current layer
  const canEditInLayer = (layer) => {
    if (layer === 'health') return isMedicalProfessional
    return LAYER_INFO[layer].canEdit
  }

  const canDeleteInLayer = (layer) => {
    if (layer === 'health') return isMedicalProfessional
    return LAYER_INFO[layer].canDelete
  }

  // Filter beings by layer type
  const healthItems = beings.filter(b => b.layer_type === 'health')
  const skillItems = beings.filter(b => b.layer_type === 'skills')
  const perceptionItems = beings.filter(b => b.layer_type === 'perception')

  // Fetch beings from Supabase
  const fetchBeings = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('beings')
        .select('*')
        .eq('user_id', currentUserId)

      if (error) throw error

      setBeings(data || [])
    } catch (err) {
      console.error('Error fetching beings:', err)
      // Use sample data if table doesn't exist yet
      setBeings([
        { id: '1', user_id: currentUserId, layer_type: 'health', label: 'Migraña', value: 2, x: 45, y: 30, description: 'Dolores de cabeza frecuentes', is_validated: false },
        { id: '2', user_id: currentUserId, layer_type: 'health', label: 'Espalda', value: 4, x: 50, y: 60, description: 'Dolor lumbar crónico', is_validated: true, validated_at: '2024-01-10' },
        { id: '3', user_id: currentUserId, layer_type: 'skills', label: 'Python', value: 2, x: 30, y: 40, description: 'Deseo aprender programación en Python' },
        { id: '4', user_id: currentUserId, layer_type: 'skills', label: 'Diseño UX', value: 3, x: 70, y: 45, description: 'Mejorar habilidades de diseño' },
        { id: '5', user_id: currentUserId, layer_type: 'perception', label: 'Colaborativo', value: 5, x: 25, y: 35, description: 'Muy colaborativo en proyectos de equipo', from_user_id: 'maria' },
        { id: '6', user_id: currentUserId, layer_type: 'perception', label: 'Comunicador', value: 4, x: 75, y: 50, description: 'Excelente comunicador', from_user_id: 'juan' }
      ])
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchBeings()
  }, [fetchBeings])

  // Sample contacts for demo
  const contacts = [
    { id: 1, name: 'María García', lastInteraction: '2024-01-15' },
    { id: 2, name: 'Juan Pérez', lastInteraction: '2024-01-10' },
    { id: 3, name: 'Ana Rodríguez', lastInteraction: '2024-01-05' }
  ]

  const handleClick = () => {
    if (!expanded) {
      onNavigate?.('identity-layers')
    }
  }

  // Center click - show contacts list
  const handleCenterClick = useCallback((e) => {
    e.stopPropagation()
    setContactsList(contacts)
  }, [])

  // Handle item left click - show details
  const handleItemClick = useCallback((e, item, layer) => {
    e.stopPropagation()
    setSelectedItem({ ...item, layer })
  }, [])

  // Handle item mouse down - track for both-button edit
  const handleItemMouseDown = useCallback((e, item, layer) => {
    setMouseButtons(e.buttons)

    // Both buttons pressed (left=1 + right=2 = 3)
    if (e.buttons === 3) {
      e.preventDefault()
      e.stopPropagation()

      // For skills: open edit mode
      // For health: show details (cannot edit unless medical professional)
      // For perception: show details (cannot edit)
      if (canEditInLayer(layer)) {
        setEditItemBubble({ ...item, layer })
        setNewItemLabel(item.label || '')
        setNewItemDescription(item.description || '')
        setNewItemValue(item.value || 3)
        setTimeout(() => inputRef.current?.focus(), 100)
      } else {
        // Just show details
        setSelectedItem({ ...item, layer })
      }
    }
  }, [isMedicalProfessional])

  // Handle item right click - prevent default
  const handleItemContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (mouseButtons === 3) {
      setMouseButtons(0)
    }
  }, [mouseButtons])

  // Handle container right click - add new item
  const handleContainerContextMenu = useCallback((e) => {
    if (e.target.closest('.layer-item') || e.target.closest('.vitruvian-center')) {
      return
    }

    // Check if can create in current layer
    if (!LAYER_INFO[currentLayer].canCreate) {
      e.preventDefault()
      if (currentLayer === 'perception') {
        onShowInfo?.('Las percepciones las dejan otros usuarios sobre ti')
      }
      return
    }

    e.preventDefault()
    e.stopPropagation()

    const rect = wrapperRef.current?.getBoundingClientRect()
    if (rect) {
      const currentPan = panRef.current

      const mouseX = e.clientX - rect.left - currentPan.x
      const mouseY = e.clientY - rect.top - currentPan.y

      // Convert to percentage position within container
      const relX = (mouseX / rect.width) * 100
      const relY = (mouseY / rect.height) * 100

      // Only add if within reasonable bounds
      if (relX >= 5 && relX <= 95 && relY >= 5 && relY <= 95) {
        setAddItemBubble({ x: relX, y: relY, layer: currentLayer })
        setNewItemLabel('')
        setNewItemDescription('')
        setNewItemValue(3)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }, [currentLayer, onShowInfo])

  // Save new item to Supabase
  const handleSaveNewItem = useCallback(async () => {
    if (!newItemLabel.trim() || !addItemBubble) return

    setSaving(true)
    try {
      const newBeing = {
        user_id: currentUserId,
        layer_type: addItemBubble.layer,
        label: newItemLabel.trim(),
        description: newItemDescription.trim(),
        value: newItemValue,
        x: addItemBubble.x,
        y: addItemBubble.y,
        is_validated: false // Health items start unvalidated
      }

      const { data, error } = await supabase
        .from('beings')
        .insert(newBeing)
        .select()
        .single()

      if (error) throw error

      setBeings(prev => [...prev, data])

      const layerLabel = LAYER_INFO[addItemBubble.layer].label
      if (addItemBubble.layer === 'health') {
        onShowInfo?.(`${layerLabel}: "${newItemLabel}" creado. Pendiente validación médica.`)
      } else {
        onShowInfo?.(`${layerLabel}: "${newItemLabel}" agregado`)
      }
    } catch (err) {
      console.error('Error saving being:', err)
      // Fallback: add to local state anyway
      const localItem = {
        id: Date.now().toString(),
        user_id: currentUserId,
        layer_type: addItemBubble.layer,
        label: newItemLabel.trim(),
        description: newItemDescription.trim(),
        value: newItemValue,
        x: addItemBubble.x,
        y: addItemBubble.y,
        is_validated: false
      }
      setBeings(prev => [...prev, localItem])
      onShowInfo?.(`${LAYER_INFO[addItemBubble.layer].label}: "${newItemLabel}" agregado (local)`)
    } finally {
      setSaving(false)
      setAddItemBubble(null)
      setNewItemLabel('')
      setNewItemDescription('')
    }
  }, [newItemLabel, newItemDescription, newItemValue, addItemBubble, currentUserId, onShowInfo])

  // Save edited item to Supabase (skills only for regular users)
  const handleSaveEditItem = useCallback(async () => {
    if (!newItemLabel.trim() || !editItemBubble) return
    if (!canEditInLayer(editItemBubble.layer)) {
      onShowInfo?.('No tienes permisos para editar este elemento')
      return
    }

    setSaving(true)
    try {
      const updates = {
        label: newItemLabel.trim(),
        description: newItemDescription.trim(),
        value: newItemValue
      }

      const { error } = await supabase
        .from('beings')
        .update(updates)
        .eq('id', editItemBubble.id)

      if (error) throw error

      setBeings(prev => prev.map(item =>
        item.id === editItemBubble.id
          ? { ...item, ...updates }
          : item
      ))
      onShowInfo?.(`Actualizado: "${newItemLabel}"`)
    } catch (err) {
      console.error('Error updating being:', err)
      // Fallback: update local state anyway
      setBeings(prev => prev.map(item =>
        item.id === editItemBubble.id
          ? { ...item, label: newItemLabel.trim(), description: newItemDescription.trim(), value: newItemValue }
          : item
      ))
      onShowInfo?.(`Actualizado: "${newItemLabel}" (local)`)
    } finally {
      setSaving(false)
      setEditItemBubble(null)
      setNewItemLabel('')
      setNewItemDescription('')
    }
  }, [newItemLabel, newItemDescription, newItemValue, editItemBubble, onShowInfo, isMedicalProfessional])

  // Delete item from Supabase (skills only for regular users)
  const handleDeleteItem = useCallback(async () => {
    if (!editItemBubble) return
    if (!canDeleteInLayer(editItemBubble.layer)) {
      onShowInfo?.('No tienes permisos para eliminar este elemento')
      return
    }

    if (!confirm(`¿Eliminar "${editItemBubble.label}"?`)) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('beings')
        .delete()
        .eq('id', editItemBubble.id)

      if (error) throw error

      setBeings(prev => prev.filter(item => item.id !== editItemBubble.id))
      onShowInfo?.('Elemento eliminado')
    } catch (err) {
      console.error('Error deleting being:', err)
      // Fallback: delete from local state anyway
      setBeings(prev => prev.filter(item => item.id !== editItemBubble.id))
      onShowInfo?.('Elemento eliminado (local)')
    } finally {
      setSaving(false)
      setEditItemBubble(null)
    }
  }, [editItemBubble, onShowInfo, isMedicalProfessional])

  // Handle file upload for health items
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedItem || selectedItem.layer !== 'health') return

    onShowInfo?.(`Subiendo ${file.name}...`)

    try {
      // Upload to Supabase Storage
      const filePath = `${currentUserId}/${selectedItem.id}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('being-attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('being-attachments')
        .getPublicUrl(filePath)

      // Save attachment record
      const { error: dbError } = await supabase
        .from('being_attachments')
        .insert({
          being_id: selectedItem.id,
          file_name: file.name,
          file_type: file.type.startsWith('image/') ? 'image' : 'other',
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: currentUserId
        })

      if (dbError) throw dbError

      onShowInfo?.(`Archivo "${file.name}" adjuntado correctamente`)
    } catch (err) {
      console.error('Error uploading file:', err)
      onShowInfo?.(`Error al subir archivo: ${err.message}`)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [selectedItem, currentUserId, onShowInfo])

  // Mouse button events (panning)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleMouseDown = (e) => {
      if (e.button === 1) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y })
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

    wrapper.addEventListener('mousedown', handleMouseDown)
    wrapper.addEventListener('mousemove', handleMouseMove)
    wrapper.addEventListener('mouseup', handleMouseUp)
    wrapper.addEventListener('mouseleave', () => setIsPanning(false))

    return () => {
      wrapper.removeEventListener('mousedown', handleMouseDown)
      wrapper.removeEventListener('mousemove', handleMouseMove)
      wrapper.removeEventListener('mouseup', handleMouseUp)
      wrapper.removeEventListener('mouseleave', () => setIsPanning(false))
    }
  }, [isPanning, panStart])

  // Wheel to switch layers
  const handleWheel = useCallback((e) => {
    e.preventDefault()

    // Accumulate wheel delta
    wheelAccumulator.current += e.deltaY

    // Threshold for layer change
    const threshold = 25

    if (wheelAccumulator.current > threshold) {
      // Scroll down = go to outer layer (lower index)
      wheelAccumulator.current = 0
      setCurrentLayerIndex(prev => Math.max(0, prev - 1))
    } else if (wheelAccumulator.current < -threshold) {
      // Scroll up = go to inner layer (higher index)
      wheelAccumulator.current = 0
      setCurrentLayerIndex(prev => Math.min(LAYERS.length - 1, prev + 1))
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedItem(null)
        setAddItemBubble(null)
        setEditItemBubble(null)
        setContactsList(null)
        setPan({ x: 0, y: 0 })
      }
      if (e.key === 'Enter' && addItemBubble && !saving) {
        handleSaveNewItem()
      }
      if (e.key === 'Enter' && editItemBubble && !saving) {
        handleSaveEditItem()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addItemBubble, editItemBubble, saving, handleSaveNewItem, handleSaveEditItem])

  if (loading) {
    return (
      <div className={`quadrant quadrant-ul ${expanded ? 'expanded' : ''}`}>
        <span className="quadrant-label">I</span>
        <div className="quadrant-content">
          <div className="loading">Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <div ref={quadrantRef} className={`quadrant quadrant-ul ${expanded ? 'expanded' : ''}`} onClick={handleClick} onWheel={handleWheel}>
      <span className="quadrant-label" onClick={(e) => { e.stopPropagation(); onExpand?.(); }}>I</span>

      {/* Layer indicator - at very top */}
      <div className="layer-indicator">
        <span className="layer-icon">{layerInfo.icon}</span>
        <span className="layer-name">{layerInfo.label}</span>
      </div>

      <div className="quadrant-content">
        <div
          ref={wrapperRef}
          className={`vitruvian-wrapper ${isPanning ? 'panning' : ''}`}
          onContextMenu={handleContainerContextMenu}
        >
          <div
            className="vitruvian-container"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`
            }}
          >
            {/* Three vitruvian layers - only one visible at a time */}
            <div className={`vitruvian-body vitruvian-health ${currentLayer === 'health' ? 'active' : ''}`} />
            <div className={`vitruvian-body vitruvian-skills ${currentLayer === 'skills' ? 'active' : ''}`} />
            <div className={`vitruvian-body vitruvian-perception ${currentLayer === 'perception' ? 'active' : ''}`} />

            {/* Center click zone */}
            <div
              className="vitruvian-center"
              onClick={handleCenterClick}
              title="Ver contactos"
            />

            {/* Health items */}
            {healthItems.map((item) => (
              <div
                key={`health-${item.id}`}
                className={`layer-item health-item ${currentLayer === 'health' ? 'visible' : 'faded'} ${item.is_validated ? 'validated' : 'pending'}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  '--item-color': getValueColor(item.value)
                }}
                onClick={(e) => handleItemClick(e, item, 'health')}
                onMouseDown={(e) => handleItemMouseDown(e, item, 'health')}
                onContextMenu={handleItemContextMenu}
                onMouseEnter={() => setHoveredItem({ ...item, layer: 'health' })}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="item-icon">✚</span>
                {!item.is_validated && <span className="pending-badge">?</span>}
                {(hoveredItem?.id === item.id && hoveredItem?.layer === 'health') && (
                  <span className="item-tooltip">
                    {item.label}
                    {!item.is_validated && <small className="validation-hint"> (pendiente validación)</small>}
                  </span>
                )}
              </div>
            ))}

            {/* Skill items */}
            {skillItems.map((item) => (
              <div
                key={`skill-${item.id}`}
                className={`layer-item skill-item ${currentLayer === 'skills' ? 'visible' : 'faded'}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  '--item-color': getValueColor(item.value)
                }}
                onClick={(e) => handleItemClick(e, item, 'skills')}
                onMouseDown={(e) => handleItemMouseDown(e, item, 'skills')}
                onContextMenu={handleItemContextMenu}
                onMouseEnter={() => setHoveredItem({ ...item, layer: 'skills' })}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="item-icon">★</span>
                {(hoveredItem?.id === item.id && hoveredItem?.layer === 'skills') && (
                  <span className="item-tooltip">{item.label}</span>
                )}
              </div>
            ))}

            {/* Perception items (grey dots) */}
            {perceptionItems.map((item) => (
              <div
                key={`perception-${item.id}`}
                className={`layer-item perception-item ${currentLayer === 'perception' ? 'visible' : 'faded'}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`
                }}
                onClick={(e) => handleItemClick(e, item, 'perception')}
                onMouseEnter={() => setHoveredItem({ ...item, layer: 'perception' })}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="item-icon">●</span>
                {(hoveredItem?.id === item.id && hoveredItem?.layer === 'perception') && (
                  <span className="item-tooltip">{item.label}<br/><small>{item.description}</small></span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Hidden file input for health attachments */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileUpload}
      />

      {/* Item detail bubble */}
      {selectedItem && (
        <div className="item-bubble" onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }}>
          <div className="bubble-content" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setSelectedItem(null)}>×</button>

            {selectedItem.layer === 'health' && (
              <>
                <h3 style={{ color: getValueColor(selectedItem.value) }}>
                  <span className="bubble-icon">✚</span> {selectedItem.label}
                </h3>

                {/* Validation status */}
                <div className={`validation-status ${selectedItem.is_validated ? 'validated' : 'pending'}`}>
                  {selectedItem.is_validated ? (
                    <>
                      <span className="status-icon">✓</span>
                      <span>Validado {selectedItem.validated_at && `el ${new Date(selectedItem.validated_at).toLocaleDateString()}`}</span>
                    </>
                  ) : (
                    <>
                      <span className="status-icon">⏳</span>
                      <span>Pendiente validación médica</span>
                    </>
                  )}
                </div>

                <div className="severity-bar">
                  <span>Severidad:</span>
                  <div className="severity-track">
                    <div
                      className="severity-fill"
                      style={{
                        width: `${selectedItem.value * 20}%`,
                        background: getValueColor(selectedItem.value)
                      }}
                    />
                  </div>
                  <span>{selectedItem.value}/5</span>
                </div>

                {selectedItem.description && (
                  <p className="bubble-description">{selectedItem.description}</p>
                )}

                {/* Attach file button */}
                <button
                  className="btn-attach"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎 Adjuntar archivo (estudio, imagen, lab...)
                </button>

                <p className="permission-note">
                  Solo un profesional médico puede modificar o eliminar este registro.
                </p>
              </>
            )}

            {selectedItem.layer === 'skills' && (
              <>
                <h3 style={{ color: '#42a5f5' }}>
                  <span className="bubble-icon">★</span> {selectedItem.label}
                </h3>
                <div className="level-bar">
                  <span>Interés:</span>
                  <div className="level-track">
                    <div
                      className="level-fill"
                      style={{ width: `${selectedItem.value * 20}%` }}
                    />
                  </div>
                  <span>{selectedItem.value}/5</span>
                </div>
                {selectedItem.description && (
                  <p className="bubble-description">{selectedItem.description}</p>
                )}
              </>
            )}

            {selectedItem.layer === 'perception' && (
              <>
                <h3 style={{ color: '#9E9E9E' }}>
                  <span className="bubble-icon">●</span> {selectedItem.label}
                </h3>
                <blockquote className="perception-quote">
                  "{selectedItem.description}"
                </blockquote>
                <p className="permission-note">
                  Las percepciones son dejadas por otros miembros y no pueden ser editadas.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add item bubble */}
      {addItemBubble && (
        <div className="item-bubble" onClick={(e) => { e.stopPropagation(); setAddItemBubble(null); }}>
          <div className="bubble-content add-item-bubble" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setAddItemBubble(null)}>×</button>
            <h3 style={{ color: LAYER_INFO[addItemBubble.layer].color }}>
              <span className="bubble-icon">{LAYER_INFO[addItemBubble.layer].icon}</span>
              {addItemBubble.layer === 'health' ? 'Nueva Condición' : 'Nuevo Deseo de Aprendizaje'}
            </h3>

            {addItemBubble.layer === 'health' && (
              <p className="form-note">
                Este registro requerirá validación de un profesional médico.
              </p>
            )}

            <div className="form-group">
              <label>Nombre</label>
              <input
                ref={inputRef}
                type="text"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder={addItemBubble.layer === 'health' ? 'Ej: Alergia, Dolor...' : 'Ej: Python, Diseño...'}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>{addItemBubble.layer === 'health' ? 'Severidad' : 'Nivel de interés'}: {newItemValue}/5</label>
              <input
                type="range"
                min="1"
                max="5"
                value={newItemValue}
                onChange={(e) => setNewItemValue(parseInt(e.target.value))}
                style={{ '--severity-color': getValueColor(newItemValue) }}
                className="severity-slider"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder={addItemBubble.layer === 'health'
                  ? 'Describe la condición, síntomas, etc...'
                  : 'Por qué quieres aprender esto...'}
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setAddItemBubble(null)} disabled={saving}>Cancelar</button>
              <button className="btn-save" onClick={handleSaveNewItem} disabled={!newItemLabel.trim() || saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit item bubble (skills only) */}
      {editItemBubble && (
        <div className="item-bubble" onClick={(e) => { e.stopPropagation(); setEditItemBubble(null); }}>
          <div className="bubble-content add-item-bubble" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setEditItemBubble(null)}>×</button>
            <h3 style={{ color: LAYER_INFO[editItemBubble.layer].color }}>
              <span className="bubble-icon">{LAYER_INFO[editItemBubble.layer].icon}</span>
              Editar
            </h3>

            <div className="form-group">
              <label>Nombre</label>
              <input
                ref={inputRef}
                type="text"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Nivel de interés: {newItemValue}/5</label>
              <input
                type="range"
                min="1"
                max="5"
                value={newItemValue}
                onChange={(e) => setNewItemValue(parseInt(e.target.value))}
                style={{ '--severity-color': getValueColor(newItemValue) }}
                className="severity-slider"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="form-actions">
              <button className="btn-delete" onClick={handleDeleteItem} disabled={saving}>Eliminar</button>
              <button className="btn-cancel" onClick={() => setEditItemBubble(null)} disabled={saving}>Cancelar</button>
              <button className="btn-save" onClick={handleSaveEditItem} disabled={!newItemLabel.trim() || saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts list */}
      {contactsList && (
        <div className="item-bubble" onClick={(e) => { e.stopPropagation(); setContactsList(null); }}>
          <div className="bubble-content contacts-bubble" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setContactsList(null)}>×</button>
            <h3>Contactos</h3>
            <p className="bubble-subtitle">Personas con las que has interactuado</p>

            <div className="contacts-list">
              {contactsList.map((contact) => (
                <div
                  key={contact.id}
                  className="contact-item"
                  onClick={() => {
                    onShowInfo?.(`Abriendo perfil de ${contact.name}...`)
                    setContactsList(null)
                  }}
                >
                  <div className="contact-avatar">{contact.name.charAt(0)}</div>
                  <div className="contact-info">
                    <span className="contact-name">{contact.name}</span>
                    <span className="contact-date">Última interacción: {contact.lastInteraction}</span>
                  </div>
                  <span className="contact-arrow">→</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UpperLeft
