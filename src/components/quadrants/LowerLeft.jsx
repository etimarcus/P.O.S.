/**
 * Lower Left Quadrant - "WE" Interior Collective
 * Hands - Giving & Sacrificing for Action
 *
 * Left hand (DAR): Dimensions of human effort in action
 * - Effort, Motus, Voluntas, Cognito, Tempus
 * - Clicking shows tasks characterized by that dimension
 *
 * Right hand (SACRIFICAR): Opportunity cost - what you sacrifice
 * - Health: Sleep, nutrition, physical activity neglected
 * - Social: Friendships and relationships not cultivated
 * - Work: Professional commitments unfulfilled
 * - Career: Personal growth/vocational search abandoned
 * - Family: Family presence and time lost
 *
 * The sacrifice coefficient acts as a multiplier for action value
 * Third-party validations can confirm sacrifices to increase the coefficient
 */

import { useState, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import './LowerLeft.css'

// Left hand (Give/Dar) = Dimensions of effort
const GIVE_WORDS = [
  { id: 'effort', text: 'Labor', position: { x: -2.2, y: 36.2 }, size: 1.20, description: 'Esfuerzo físico y mental' },
  { id: 'motus', text: 'Sympathia', position: { x: -3.0, y: 14.3 }, size: 1.20, description: 'Movimiento y acción' },
  { id: 'voluntas', text: 'Voluntas', position: { x: 9.7, y: 0.3 }, size: 1.20, description: 'Voluntad y determinación' },
  { id: 'cognito', text: 'Cognitio', position: { x: 28.8, y: 2.4 }, size: 1.10, description: 'Conocimiento y pensamiento' },
  { id: 'tempus', text: 'Tempus', position: { x: 38.7, y: 27.3 }, size: 1.20, description: 'Tiempo invertido' }
]

// Right hand (Sacrifice) = Opportunity cost areas
const SACRIFICE_WORDS = [
  { id: 'health', text: 'Salus', position: { x: 100.5, y: 37.8 }, size: 1.50, description: 'Sueño, alimentación y actividad física que descuidas', costField: 'health_cost', weightField: 'health_weight', contextField: 'health_context' },
  { id: 'social', text: 'Societas', position: { x: 99.3, y: 16.8 }, size: 1.40, description: 'Amistades y relaciones que no cultivas', costField: 'social_cost', weightField: 'social_weight', contextField: 'social_context' },
  { id: 'work', text: 'Opus', position: { x: 90.3, y: 3.9 }, size: 1.40, description: 'Compromisos laborales que incumples', costField: 'work_cost', weightField: 'work_weight', contextField: 'work_context' },
  { id: 'career', text: 'Vocatio', position: { x: 73.8, y: 2.4 }, size: 1.50, description: 'Búsqueda vocacional que abandonas', costField: 'career_cost', weightField: 'career_weight', contextField: 'career_context' },
  { id: 'family', text: 'Familia', position: { x: 59.7, y: 28.0 }, size: 1.50, description: 'Presencia familiar que pierdes', costField: 'family_cost', weightField: 'family_weight', contextField: 'family_context' }
]

// Dimension colors (left hand)
const DIMENSION_COLORS = {
  effort: '#ff6b6b',
  motus: '#4ecdc4',
  voluntas: '#ffe66d',
  cognito: '#95e1d3',
  tempus: '#dda0dd'
}

// Sacrifice/cost colors (right hand) - warmer, more somber tones
const SACRIFICE_COLORS = {
  health: '#e57373',
  social: '#7986cb',
  work: '#ffb74d',
  career: '#ba68c8',
  family: '#f06292'
}

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

export function LowerLeft({ onNavigate, onShowInfo, onExpand, expanded, userId }) {
  const currentUserId = userId || MOCK_USER_ID

  const [hoveredWord, setHoveredWord] = useState(null)

  // Task list state (left hand)
  const [selectedDimension, setSelectedDimension] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  // Sacrifice/cost state (right hand)
  const [selectedSacrifice, setSelectedSacrifice] = useState(null)
  const [sacrificeData, setSacrificeData] = useState(null)
  const [loadingSacrifice, setLoadingSacrifice] = useState(false)

  const handleClick = () => {
    if (!expanded) {
      onNavigate?.('contributions')
    }
  }

  // ═══════════════════════════════════════════
  // LEFT HAND - TASKS BY DIMENSION
  // ═══════════════════════════════════════════

  const fetchTasksByDimension = useCallback(async (dimension) => {
    setLoadingTasks(true)
    try {
      const dimensionColumn = `${dimension}_level`
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'active')
        .order(dimensionColumn, { ascending: false })

      if (error) throw error
      const filteredTasks = (data || []).filter(task =>
        task.primary_dimension === dimension || task[dimensionColumn] >= 3
      )
      setTasks(filteredTasks)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      // Sample data
      setTasks([
        { id: '1', title: 'Ejercicio matutino', description: 'Rutina de cardio', task_type: 'routine',
          effort_level: 4, motus_level: 5, voluntas_level: 3, cognito_level: 1, tempus_level: 2,
          health_cost: 0, social_cost: 1, work_cost: 0, career_cost: 0, family_cost: 2,
          primary_dimension: 'motus', weighted_sacrifice_score: 0.6 },
        { id: '2', title: 'Estudiar React', description: 'Curso de hooks', task_type: 'unique',
          effort_level: 3, motus_level: 1, voluntas_level: 4, cognito_level: 5, tempus_level: 4,
          health_cost: 2, social_cost: 3, work_cost: 0, career_cost: 0, family_cost: 3,
          primary_dimension: 'cognito', weighted_sacrifice_score: 2.1 },
        { id: '3', title: 'Proyecto comunitario', description: 'Organizar evento benéfico', task_type: 'unique',
          effort_level: 4, motus_level: 4, voluntas_level: 5, cognito_level: 3, tempus_level: 5,
          health_cost: 3, social_cost: 0, work_cost: 2, career_cost: 1, family_cost: 4,
          primary_dimension: 'voluntas', weighted_sacrifice_score: 3.2 },
        { id: '4', title: 'Freelance urgente', description: 'Entrega para cliente', task_type: 'unique',
          effort_level: 5, motus_level: 2, voluntas_level: 3, cognito_level: 4, tempus_level: 5,
          health_cost: 4, social_cost: 2, work_cost: 0, career_cost: 0, family_cost: 5,
          primary_dimension: 'tempus', weighted_sacrifice_score: 4.1 },
        { id: '5', title: 'Limpieza semanal', description: 'Hogar', task_type: 'routine',
          effort_level: 5, motus_level: 4, voluntas_level: 2, cognito_level: 1, tempus_level: 3,
          health_cost: 1, social_cost: 1, work_cost: 0, career_cost: 0, family_cost: 0,
          primary_dimension: 'effort', weighted_sacrifice_score: 0.4 }
      ].filter(task =>
        task.primary_dimension === dimension || task[`${dimension}_level`] >= 3
      ))
    } finally {
      setLoadingTasks(false)
    }
  }, [currentUserId])

  const handleGiveWordClick = useCallback((e, word) => {
    e.stopPropagation()
    setSelectedSacrifice(null)
    setSelectedDimension(word)
    fetchTasksByDimension(word.id)
    onShowInfo?.(`Tareas de ${word.text}`)
  }, [fetchTasksByDimension, onShowInfo])

  // ═══════════════════════════════════════════
  // RIGHT HAND - SACRIFICE / OPPORTUNITY COST
  // ═══════════════════════════════════════════

  const fetchSacrificeData = useCallback(async (sacrificeArea) => {
    setLoadingSacrifice(true)
    try {
      // Get user's cost profile
      const { data: profile, error: profileError } = await supabase
        .from('opportunity_cost_profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .single()

      // Get tasks with high cost in this area
      const costColumn = `${sacrificeArea.id}_cost`
      const { data: costlyTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, sacrifice_validations(*)')
        .eq('user_id', currentUserId)
        .eq('status', 'active')
        .gte(costColumn, 3)
        .order(costColumn, { ascending: false })

      if (profileError && profileError.code !== 'PGRST116') throw profileError
      if (tasksError) throw tasksError

      setSacrificeData({
        profile: profile || null,
        tasks: costlyTasks || []
      })
    } catch (err) {
      console.error('Error fetching sacrifice data:', err)
      // Sample data
      const sampleProfiles = {
        health: { weight: 4, context: 'Recuperándome de una lesión' },
        social: { weight: 3, context: 'Recién mudado, construyendo conexiones' },
        work: { weight: 4, context: 'Proyecto crítico Q1' },
        career: { weight: 5, context: 'En transición de carrera' },
        family: { weight: 5, context: 'Dos hijos menores de 5 años' }
      }
      const sampleTasks = [
        { id: '1', title: 'Proyecto comunitario', health_cost: 3, social_cost: 0, work_cost: 2, career_cost: 1, family_cost: 4,
          weighted_sacrifice_score: 3.2, validations: 2 },
        { id: '2', title: 'Freelance urgente', health_cost: 4, social_cost: 2, work_cost: 0, career_cost: 0, family_cost: 5,
          weighted_sacrifice_score: 4.1, validations: 1 },
        { id: '3', title: 'Estudiar React', health_cost: 2, social_cost: 3, work_cost: 0, career_cost: 0, family_cost: 3,
          weighted_sacrifice_score: 2.1, validations: 0 }
      ].filter(t => t[`${sacrificeArea.id}_cost`] >= 3)

      setSacrificeData({
        profile: {
          [`${sacrificeArea.id}_weight`]: sampleProfiles[sacrificeArea.id].weight,
          [`${sacrificeArea.id}_context`]: sampleProfiles[sacrificeArea.id].context
        },
        tasks: sampleTasks
      })
    } finally {
      setLoadingSacrifice(false)
    }
  }, [currentUserId])

  const handleSacrificeWordClick = useCallback((e, word) => {
    e.stopPropagation()
    setSelectedDimension(null)
    setSelectedSacrifice(word)
    fetchSacrificeData(word)
    onShowInfo?.(`Costo: ${word.text}`)
  }, [fetchSacrificeData, onShowInfo])

  // Get weight level label
  const getWeightLabel = (weight) => {
    if (weight >= 5) return 'Muy Alto'
    if (weight >= 4) return 'Alto'
    if (weight >= 3) return 'Moderado'
    if (weight >= 2) return 'Bajo'
    return 'Muy Bajo'
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div className={`quadrant quadrant-ll ${expanded ? 'expanded' : ''}`} onClick={handleClick}>
      <span className="quadrant-label" onClick={(e) => { e.stopPropagation(); onExpand?.(); }}>WE</span>

      <div className="quadrant-content">
        <div className="hands-container">
          <div className="hands-wrapper">
            <img src="/hands.png" alt="Hands - Give and Sacrifice" className="hands-image" />

            {/* Left hand - Dimensions of effort */}
            {GIVE_WORDS.map((word) => (
              <span
                key={word.id}
                className={`hand-word give-word ${hoveredWord?.id === word.id ? 'hovered' : ''} ${selectedDimension?.id === word.id ? 'selected' : ''}`}
                style={{ left: `${word.position.x}%`, top: `${word.position.y}%`, transform: `translate(-50%, -50%) scale(${word.size})` }}
                onClick={(e) => handleGiveWordClick(e, word)}
                onMouseEnter={() => setHoveredWord(word)}
                onMouseLeave={() => setHoveredWord(null)}
              >
                {word.text}
              </span>
            ))}

            {/* Right hand - Sacrifice / Opportunity cost */}
            {SACRIFICE_WORDS.map((word) => (
              <span
                key={word.id}
                className={`hand-word receive-word ${hoveredWord?.id === word.id ? 'hovered' : ''} ${selectedSacrifice?.id === word.id ? 'selected' : ''}`}
                style={{ left: `${word.position.x}%`, top: `${word.position.y}%`, transform: `translate(-50%, -50%) scale(${word.size})` }}
                onClick={(e) => handleSacrificeWordClick(e, word)}
                onMouseEnter={() => setHoveredWord(word)}
                onMouseLeave={() => setHoveredWord(null)}
              >
                {word.text}
              </span>
            ))}

            <span className="hand-label give-label">ACTIO</span>
            <span className="hand-label receive-label">DEVOTIO</span>
          </div>
        </div>
      </div>

      {/* Task list bubble (left hand) */}
      {selectedDimension && (
        <div className="word-bubble" onClick={(e) => { e.stopPropagation(); setSelectedDimension(null); }}>
          <div className="bubble-content task-list-bubble" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setSelectedDimension(null)}>×</button>

            <h3 style={{ color: DIMENSION_COLORS[selectedDimension.id] }}>
              {selectedDimension.text}
            </h3>
            <p className="dimension-description">{selectedDimension.description}</p>

            <div className="task-list-header">
              <span className="task-count">
                {loadingTasks ? 'Cargando...' : `${tasks.length} tareas activas`}
              </span>
            </div>

            {!loadingTasks && tasks.length === 0 ? (
              <p className="no-tasks">No hay tareas activas con esta dimensión dominante.</p>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <div key={task.id} className={`task-item ${task.task_type}`}>
                    <div className="task-header">
                      <span className="task-type-icon">{task.task_type === 'routine' ? '🔄' : '📌'}</span>
                      <span className="task-title">{task.title}</span>
                      {task.weighted_sacrifice_score > 0 && (
                        <span className="sacrifice-badge" title="Coeficiente de sacrificio">
                          ⚖️ {task.weighted_sacrifice_score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {task.description && <p className="task-description">{task.description}</p>}

                    {/* Effort dimensions */}
                    <div className="task-dimensions">
                      {['effort', 'motus', 'voluntas', 'cognito', 'tempus'].map(dim => (
                        <div key={dim} className={`dimension-bar ${dim === selectedDimension.id ? 'highlighted' : ''}`} title={`${dim}: ${task[`${dim}_level`]}/5`}>
                          <div className="dimension-fill" style={{
                            width: `${task[`${dim}_level`] * 20}%`,
                            backgroundColor: dim === selectedDimension.id ? DIMENSION_COLORS[dim] : 'rgba(255,255,255,0.3)'
                          }} />
                        </div>
                      ))}
                    </div>

                    {/* Sacrifice costs */}
                    {(task.health_cost > 0 || task.social_cost > 0 || task.work_cost > 0 || task.career_cost > 0 || task.family_cost > 0) && (
                      <div className="task-costs">
                        <span className="costs-label">Sacrificio:</span>
                        {['health', 'social', 'work', 'career', 'family'].map(area => (
                          task[`${area}_cost`] > 0 && (
                            <span key={area} className="cost-tag" style={{ backgroundColor: SACRIFICE_COLORS[area] }}>
                              {area.charAt(0).toUpperCase()}: {task[`${area}_cost`]}
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sacrifice/Opportunity Cost bubble (right hand) */}
      {selectedSacrifice && (
        <div className="word-bubble" onClick={(e) => { e.stopPropagation(); setSelectedSacrifice(null); }}>
          <div className="bubble-content sacrifice-bubble" onClick={(e) => e.stopPropagation()}>
            <button className="bubble-close" onClick={() => setSelectedSacrifice(null)}>×</button>

            <h3 style={{ color: SACRIFICE_COLORS[selectedSacrifice.id] }}>
              {selectedSacrifice.text}
            </h3>
            <p className="sacrifice-description">{selectedSacrifice.description}</p>

            {loadingSacrifice ? (
              <p className="loading-text">Cargando...</p>
            ) : sacrificeData && (
              <>
                {/* Current context and weight */}
                <div className="cost-profile-section">
                  <div className="profile-header">
                    <span className="profile-label">Tu contexto actual</span>
                    <span className="weight-badge" style={{ backgroundColor: SACRIFICE_COLORS[selectedSacrifice.id] }}>
                      Peso: {getWeightLabel(sacrificeData.profile?.[selectedSacrifice.weightField] || 3)}
                    </span>
                  </div>

                  <div className="weight-indicator">
                    {[1, 2, 3, 4, 5].map(level => (
                      <div
                        key={level}
                        className={`weight-block ${level <= (sacrificeData.profile?.[selectedSacrifice.weightField] || 3) ? 'active' : ''}`}
                        style={{ backgroundColor: level <= (sacrificeData.profile?.[selectedSacrifice.weightField] || 3) ? SACRIFICE_COLORS[selectedSacrifice.id] : undefined }}
                      />
                    ))}
                  </div>

                  {sacrificeData.profile?.[selectedSacrifice.contextField] && (
                    <p className="context-text">"{sacrificeData.profile[selectedSacrifice.contextField]}"</p>
                  )}

                  <p className="weight-explanation">
                    Un peso alto significa que sacrificar esta área tiene mayor impacto en tu vida actual.
                    Esto aumenta el coeficiente de las acciones que requieren este sacrificio.
                  </p>
                </div>

                {/* Tasks with high cost in this area */}
                <div className="costly-tasks-section">
                  <span className="section-label">
                    Tareas con alto costo en {selectedSacrifice.text.toLowerCase()}
                  </span>

                  {sacrificeData.tasks.length === 0 ? (
                    <p className="no-tasks">No hay tareas activas con alto costo en esta área.</p>
                  ) : (
                    <div className="sacrifice-task-list">
                      {sacrificeData.tasks.map((task) => (
                        <div key={task.id} className="sacrifice-task-item">
                          <div className="sacrifice-task-header">
                            <span className="sacrifice-task-title">{task.title}</span>
                            <span className="sacrifice-level" style={{ color: SACRIFICE_COLORS[selectedSacrifice.id] }}>
                              -{task[selectedSacrifice.costField]}/5
                            </span>
                          </div>
                          <div className="sacrifice-task-footer">
                            <span className="coefficient">
                              Coef: ×{task.weighted_sacrifice_score?.toFixed(2) || '1.00'}
                            </span>
                            {task.validations > 0 && (
                              <span className="validations-count">
                                ✓ {task.validations} validaciones
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="validation-note">
                  Las validaciones de terceros confirman tus sacrificios e incrementan el coeficiente de impacto de tus acciones.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LowerLeft
