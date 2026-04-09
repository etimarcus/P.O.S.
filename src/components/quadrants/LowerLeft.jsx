/**
 * Lower Left Quadrant - "WE" Interior Colectivo
 *
 * Three holonic layers: Homestead (~12), Guild (~96), Cell (~1000)
 * Collective vector reveals scarcity → orders tasks
 * Tasks have 3-dimensional composition: Cognitio, Sympathia, Labor
 * Voluntas (V) is a task-level coefficient, not a dimension
 */

import { useState, useCallback, useMemo } from 'react'
import './LowerLeft.css'

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const LAYERS = ['HOMESTEAD', 'GUILD', 'CELL']
const PREVIEW_COUNT = 3

const COLORS = {
  cognitio: '#BA7517',
  sympathia: '#0F6E56',
  labor: '#993C1D'
}

// ═══════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════

const MOCK_TASKS = {
  HOMESTEAD: [
    { id: 'h1',  title: 'Mediación vecinal — domo 3',                    cognitio: 0.20, sympathia: 0.60, labor: 0.20, spots: 2,  filled: 0, V: 1.4, hours_est: 2, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Facilitar conversación entre vecinos del domo 3 sobre uso de espacios comunes', resources: 'Sala de reuniones, pizarra' },
    { id: 'h2',  title: 'Cocina colectiva del martes',                   cognitio: 0.10, sympathia: 0.50, labor: 0.40, spots: 4,  filled: 3, V: 0.8, hours_est: 4, origin: 'DEBATE', status: 'ACTIVE', description: 'Preparar comida comunitaria para 12 personas', resources: 'Cocina comunitaria, ingredientes del huerto' },
    { id: 'h3',  title: 'Reparación techo domo 4',                       cognitio: 0.10, sympathia: 0.15, labor: 0.75, spots: 2,  filled: 0, V: 1.6, hours_est: 6, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Arreglar filtración detectada en el techo del domo 4', resources: 'Escalera, sellador, lona impermeable' },
    { id: 'h4',  title: 'Inventario de herramientas del cobertizo',      cognitio: 0.50, sympathia: 0.10, labor: 0.40, spots: 2,  filled: 1, V: 1.0, hours_est: 3, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Catalogar todas las herramientas y marcar las que necesitan reemplazo', resources: 'Planilla, etiquetas' },
    { id: 'h5',  title: 'Sesión de lectura comunitaria',                 cognitio: 0.45, sympathia: 0.45, labor: 0.10, spots: 6,  filled: 5, V: 0.5, hours_est: 2, origin: 'DEBATE', status: 'ACTIVE', description: 'Lectura y discusión del capítulo 4 del manual de permacultura', resources: 'Espacio techado, copias del texto' },
    { id: 'h6',  title: 'Limpieza del sistema de aguas grises',          cognitio: 0.15, sympathia: 0.05, labor: 0.80, spots: 3,  filled: 2, V: 1.3, hours_est: 4, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Desobstruir filtros y revisar cañerías del biodigestor', resources: 'Guantes, herramientas de plomería' },
    { id: 'h7',  title: 'Cuidado de niños — turno tarde',                cognitio: 0.10, sympathia: 0.70, labor: 0.20, spots: 2,  filled: 2, V: 0.4, hours_est: 4, origin: 'DEBATE', status: 'ACTIVE', description: 'Acompañar a los niños del homestead durante la tarde', resources: 'Espacio de juegos, merienda' },
    { id: 'h8',  title: 'Preparación de camas de siembra elevadas',      cognitio: 0.20, sympathia: 0.05, labor: 0.75, spots: 4,  filled: 1, V: 1.5, hours_est: 5, origin: 'DEBATE', status: 'ACTIVE', description: 'Construir y rellenar 3 camas elevadas nuevas para la temporada', resources: 'Madera, tierra, compost, clavos' },
    { id: 'h9',  title: 'Mapeo de biodiversidad del perímetro',          cognitio: 0.65, sympathia: 0.15, labor: 0.20, spots: 2,  filled: 0, V: 1.2, hours_est: 6, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Identificar y registrar especies vegetales y animales del borde del homestead', resources: 'Guía de campo, cámara, cuaderno' },
  ],
  GUILD: [
    { id: 'g1',  title: 'Diseño del sistema de riego zona B',            cognitio: 0.65, sympathia: 0.10, labor: 0.25, spots: 3,  filled: 1, V: 1.3, hours_est: 8, origin: 'DEBATE', status: 'ACTIVE', description: 'Planificar e implementar sistema de riego por goteo para la zona B del huerto', resources: 'Tubería PE, goteros, bomba solar' },
    { id: 'g2',  title: 'Taller de compostaje termofílico',              cognitio: 0.40, sympathia: 0.35, labor: 0.25, spots: 6,  filled: 5, V: 0.6, hours_est: 3, origin: 'DEBATE', status: 'ACTIVE', description: 'Enseñar técnicas de compostaje termofílico a nuevos miembros', resources: 'Compostera, termómetro, material seco' },
    { id: 'g3',  title: 'Cosecha invernadero principal',                 cognitio: 0.05, sympathia: 0.15, labor: 0.80, spots: 8,  filled: 7, V: 1.1, hours_est: 5, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Recolectar tomates y pimientos maduros', resources: 'Cajas de cosecha, tijeras de poda' },
    { id: 'g4',  title: 'Calibración del panel solar del galpón',        cognitio: 0.60, sympathia: 0.05, labor: 0.35, spots: 2,  filled: 1, V: 1.4, hours_est: 4, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Ajustar ángulo e inspeccionar conexiones del sistema fotovoltaico', resources: 'Multímetro, llave Allen, documentación del inversor' },
    { id: 'g5',  title: 'Planificación rotación de cultivos Q3',         cognitio: 0.70, sympathia: 0.15, labor: 0.15, spots: 4,  filled: 3, V: 0.9, hours_est: 6, origin: 'DEBATE', status: 'ACTIVE', description: 'Definir qué se planta en cada parcela para el próximo trimestre', resources: 'Mapa de parcelas, historial de cultivos' },
    { id: 'g6',  title: 'Reparación cerca perimetral norte',             cognitio: 0.05, sympathia: 0.10, labor: 0.85, spots: 5,  filled: 2, V: 1.5, hours_est: 8, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Reemplazar postes rotos y tensar alambre en el sector norte', resources: 'Postes de madera, alambre, tensores, cemento' },
    { id: 'g7',  title: 'Taller de fermentación de alimentos',           cognitio: 0.35, sympathia: 0.40, labor: 0.25, spots: 8,  filled: 8, V: 0.3, hours_est: 3, origin: 'DEBATE', status: 'ACTIVE', description: 'Preparar chucrut, kimchi y kéfir de agua en grupo', resources: 'Frascos, sal, vegetales, granos de kéfir' },
    { id: 'g8',  title: 'Revisión del sistema de captación de lluvia',   cognitio: 0.45, sympathia: 0.05, labor: 0.50, spots: 3,  filled: 0, V: 1.6, hours_est: 5, origin: 'DEBATE', status: 'ACTIVE', description: 'Inspeccionar tanques, canaletas y filtros antes de temporada seca', resources: 'Escalera, sellador, repuestos de filtro' },
    { id: 'g9',  title: 'Construcción de secador solar de alimentos',    cognitio: 0.30, sympathia: 0.05, labor: 0.65, spots: 4,  filled: 3, V: 1.2, hours_est: 10, origin: 'DEBATE', status: 'ACTIVE', description: 'Fabricar un deshidratador solar con materiales reciclados', resources: 'Vidrio, madera, malla metálica, pintura negra' },
  ],
  CELL: [
    { id: 'c1',  title: 'Auditoría energética Q2',                       cognitio: 0.70, sympathia: 0.10, labor: 0.20, spots: 4,  filled: 2, V: 1.5, hours_est: 16, origin: 'DEBATE', status: 'ACTIVE', description: 'Medir consumo energético de todos los domos y sistemas comunes', resources: 'Multímetro, planilla de registro, acceso al inversor' },
    { id: 'c2',  title: 'Festival de bienvenida nuevos miembros',        cognitio: 0.15, sympathia: 0.65, labor: 0.20, spots: 12, filled: 11, V: 0.7, hours_est: 8, origin: 'DEBATE', status: 'ACTIVE', description: 'Organizar jornada de integración para 15 nuevos miembros de la célula', resources: 'Espacio anfiteatro, comida, música' },
    { id: 'c3',  title: 'Mantenimiento caminos internos',                cognitio: 0.05, sympathia: 0.10, labor: 0.85, spots: 10, filled: 2, V: 1.8, hours_est: 12, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Reparar y nivelar caminos erosionados por lluvias', resources: 'Grava, palas, carretillas, compactadora' },
    { id: 'c4',  title: 'Diseño del mercado interno mensual',            cognitio: 0.40, sympathia: 0.40, labor: 0.20, spots: 6,  filled: 5, V: 0.8, hours_est: 10, origin: 'DEBATE', status: 'ACTIVE', description: 'Planificar logística y layout para el mercado de trueque de la célula', resources: 'Planos del espacio, mesas, toldos' },
    { id: 'c5',  title: 'Instalación de postes de iluminación solar',    cognitio: 0.25, sympathia: 0.05, labor: 0.70, spots: 8,  filled: 6, V: 1.2, hours_est: 12, origin: 'DEBATE', status: 'ACTIVE', description: 'Colocar 12 luminarias solares en los caminos principales', resources: 'Postes, luminarias, cemento, cables' },
    { id: 'c6',  title: 'Censo de habilidades y oficios de la célula',   cognitio: 0.55, sympathia: 0.35, labor: 0.10, spots: 5,  filled: 4, V: 0.9, hours_est: 8, origin: 'DEBATE', status: 'ACTIVE', description: 'Entrevistar a todos los miembros y construir un directorio de competencias', resources: 'Formulario digital, espacio de entrevista' },
    { id: 'c7',  title: 'Jornada de plantación de árboles frutales',     cognitio: 0.10, sympathia: 0.25, labor: 0.65, spots: 20, filled: 18, V: 0.5, hours_est: 6, origin: 'DEBATE', status: 'ACTIVE', description: 'Plantar 50 frutales en la zona de food forest de la célula', resources: 'Plantines, palas, mulch, riego temporal' },
    { id: 'c8',  title: 'Redacción del protocolo de resolución de conflictos', cognitio: 0.60, sympathia: 0.30, labor: 0.10, spots: 3, filled: 2, V: 1.3, hours_est: 12, origin: 'DEBATE', status: 'ACTIVE', description: 'Documentar proceso formal de mediación y escalamiento para la célula', resources: 'Documentos de referencia, espacio de trabajo' },
    { id: 'c9',  title: 'Limpieza general de espacios comunes',          cognitio: 0.05, sympathia: 0.15, labor: 0.80, spots: 15, filled: 14, V: 0.4, hours_est: 4, origin: 'SPONTANEOUS', status: 'ACTIVE', description: 'Barrer, ordenar y desinfectar todos los espacios de uso compartido', resources: 'Escobas, trapos, productos de limpieza' },
  ]
}

const MOCK_COLLECTIVE = {
  HOMESTEAD: { cognitio: 0.15, sympathia: 0.62, labor: 0.23 },
  GUILD:     { cognitio: 0.38, sympathia: 0.28, labor: 0.34 },
  CELL:      { cognitio: 0.25, sympathia: 0.35, labor: 0.40 },
}

// ═══════════════════════════════════════════
// SVG HELPERS
// ═══════════════════════════════════════════

function TriSVG({ c, s, l, size = 48 }) {
  const h = size * (Math.sqrt(3) / 2)
  const pts = [
    [size / 2, 0],
    [size, h],
    [0, h],
  ]
  const px = c * pts[0][0] + s * pts[1][0] + l * pts[2][0]
  const py = c * pts[0][1] + s * pts[1][1] + l * pts[2][1]

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} className="tri-svg">
      <polygon points={`${pts[0][0]},${pts[0][1]} ${px},${py} ${pts[2][0]},${pts[2][1]}`} fill={COLORS.cognitio} opacity="0.7" />
      <polygon points={`${pts[0][0]},${pts[0][1]} ${pts[1][0]},${pts[1][1]} ${px},${py}`} fill={COLORS.sympathia} opacity="0.7" />
      <polygon points={`${pts[2][0]},${pts[2][1]} ${px},${py} ${pts[1][0]},${pts[1][1]}`} fill={COLORS.labor} opacity="0.7" />
      <polygon points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <circle cx={px} cy={py} r={size * 0.06} fill="#fff" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
    </svg>
  )
}

function CompositionBar({ c, s, l }) {
  return (
    <div className="we-comp-bar">
      <div className="we-comp-seg" style={{ flex: c, backgroundColor: COLORS.cognitio }} />
      <div className="we-comp-seg" style={{ flex: s, backgroundColor: COLORS.sympathia }} />
      <div className="we-comp-seg" style={{ flex: l, backgroundColor: COLORS.labor }} />
    </div>
  )
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

export function LowerLeft({ onNavigate, onShowInfo, onExpand, expanded, userId }) {
  const [activeLayer, setActiveLayer] = useState('HOMESTEAD')
  const [expandedTask, setExpandedTask] = useState(null)

  const collective = MOCK_COLLECTIVE[activeLayer]
  const tasks = MOCK_TASKS[activeLayer]

  const scarcity = useMemo(() => {
    const dims = [
      { key: 'cognitio', label: 'Cognitio', val: collective.cognitio },
      { key: 'sympathia', label: 'Sympathia', val: collective.sympathia },
      { key: 'labor', label: 'Labor', val: collective.labor },
    ]
    dims.sort((a, b) => a.val - b.val)
    return dims[0]
  }, [collective])

  // Sort: most subscribed first (filled/spots ratio descending)
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => (b.filled / b.spots) - (a.filled / a.spots))
  }, [tasks])

  // In grid view show only PREVIEW_COUNT, in expanded show all
  const visibleTasks = expanded ? sortedTasks : sortedTasks.slice(0, PREVIEW_COUNT)

  const handleClick = () => {
    if (!expanded) {
      onNavigate?.('contributions')
    }
  }

  const handleTaskClick = useCallback((e, task) => {
    e.stopPropagation()
    setExpandedTask(prev => prev?.id === task.id ? null : task)
  }, [])

  const handleLayerChange = useCallback((e, layer) => {
    e.stopPropagation()
    setActiveLayer(layer)
    setExpandedTask(null)
  }, [])

  return (
    <div className={`quadrant quadrant-ll ${expanded ? 'expanded' : ''}`} onClick={handleClick}>
      <span className="quadrant-label" onClick={(e) => { e.stopPropagation(); onExpand?.(); }}>WE</span>

      <div className="quadrant-content we-content">
        {/* Header */}
        <div className="we-header">
          <span className="we-title">WE · INTERIOR COLECTIVO</span>
        </div>

        {/* Layer selector + collective triangle */}
        <div className="we-layer-row">
          <div className="we-layer-tabs">
            {LAYERS.map(layer => (
              <button
                key={layer}
                className={`we-layer-tab ${activeLayer === layer ? 'active' : ''}`}
                onClick={(e) => handleLayerChange(e, layer)}
              >
                {layer}
              </button>
            ))}
          </div>
          <div className="we-collective-tri" onClick={e => e.stopPropagation()}>
            <TriSVG c={collective.cognitio} s={collective.sympathia} l={collective.labor} size={48} />
          </div>
        </div>

        {/* Scarcity indicator */}
        <div className="we-scarcity" onClick={e => e.stopPropagation()}>
          <div className="we-scarcity-left">
            <span className="we-scarcity-label">ESCASEZ DEL LAYER</span>
            <span className="we-scarcity-value">{scarcity.label} escasa</span>
          </div>
          <div className="we-scarcity-pcts">
            {[
              { key: 'cognitio', label: 'C' },
              { key: 'sympathia', label: 'S' },
              { key: 'labor', label: 'L' },
            ].map(d => (
              <div key={d.key} className="we-pct-row">
                <span className="we-pct-dot" style={{ backgroundColor: COLORS[d.key] }} />
                <span className="we-pct-label">{d.label}</span>
                <span className="we-pct-val">{Math.round(collective[d.key] * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div className="we-task-list" onClick={e => e.stopPropagation()}>
          {visibleTasks.map(task => (
            <div
              key={task.id}
              className={`we-task-card ${expandedTask?.id === task.id ? 'expanded' : ''}`}
              onClick={(e) => handleTaskClick(e, task)}
            >
              <div className="we-task-row">
                <div className="we-task-tri">
                  <TriSVG c={task.cognitio} s={task.sympathia} l={task.labor} size={42} />
                </div>
                <div className="we-task-info">
                  <span className="we-task-title">{task.title}</span>
                  <CompositionBar c={task.cognitio} s={task.sympathia} l={task.labor} />
                </div>
                <span className="we-task-spots">{task.filled}/{task.spots}</span>
              </div>

              {/* Expanded detail */}
              {expandedTask?.id === task.id && (
                <div className="we-task-detail">
                  <p className="we-task-desc">{task.description}</p>
                  <div className="we-task-meta">
                    <span>~{task.hours_est}h por persona</span>
                    <span>V = {task.V.toFixed(1)}</span>
                    <span className={`we-origin we-origin-${task.origin.toLowerCase()}`}>
                      {task.origin === 'DEBATE' ? 'Debate' : 'Espontánea'}
                    </span>
                  </div>
                  {task.resources && (
                    <div className="we-task-resources">
                      <span className="we-resources-label">Recursos:</span> {task.resources}
                    </div>
                  )}
                  <button className="we-btn-anotarme" onClick={(e) => { e.stopPropagation(); onShowInfo?.(`Te anotaste en: ${task.title}`) }}>
                    ANOTARME
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Show count hint in grid mode */}
          {!expanded && sortedTasks.length > PREVIEW_COUNT && (
            <div className="we-more-hint" onClick={(e) => { e.stopPropagation(); onExpand?.(); }}>
              +{sortedTasks.length - PREVIEW_COUNT} more tasks — click to expand
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LowerLeft
