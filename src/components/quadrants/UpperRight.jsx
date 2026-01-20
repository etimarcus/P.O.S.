/**
 * Upper Right Quadrant - "IT" Exterior Individual
 * Hierarchical Word Cloud for Issues/Topics
 */

import { useState, useCallback } from 'react'
import './UpperRight.css'

// Hierarchical topic structure with children
const TOPIC_TREE = {
  root: {
    label: 'topics',
    children: [
      { id: 'governance', text: 'governance', size: 'xl' },
      { id: 'community', text: 'community', size: 'lg' },
      { id: 'energy', text: 'energy', size: 'lg' },
      { id: 'education', text: 'education', size: 'md' },
      { id: 'economy', text: 'economy', size: 'md' },
      { id: 'food', text: 'food', size: 'md' },
      { id: 'water', text: 'water', size: 'sm' },
      { id: 'housing', text: 'housing', size: 'sm' },
      { id: 'health', text: 'health', size: 'sm' },
      { id: 'transport', text: 'transport', size: 'xs' },
      { id: 'waste', text: 'waste', size: 'xs' },
      { id: 'culture', text: 'culture', size: 'md' },
      { id: 'conflict', text: 'conflict', size: 'sm' },
      { id: 'legal', text: 'legal', size: 'xs' },
      { id: 'technology', text: 'technology', size: 'sm' }
    ]
  },
  governance: {
    label: 'governance',
    children: [
      { id: 'gov-decisions', text: 'decisiones', size: 'xl' },
      { id: 'gov-voting', text: 'votación', size: 'lg' },
      { id: 'gov-councils', text: 'consejos', size: 'lg' },
      { id: 'gov-proposals', text: 'propuestas', size: 'md' },
      { id: 'gov-roles', text: 'roles', size: 'md' },
      { id: 'gov-transparency', text: 'transparencia', size: 'sm' },
      { id: 'gov-accountability', text: 'responsabilidad', size: 'sm' },
      { id: 'gov-consensus', text: 'consenso', size: 'md' }
    ]
  },
  community: {
    label: 'community',
    children: [
      { id: 'com-events', text: 'eventos', size: 'xl' },
      { id: 'com-rituals', text: 'rituales', size: 'lg' },
      { id: 'com-celebrations', text: 'celebraciones', size: 'lg' },
      { id: 'com-circles', text: 'círculos', size: 'md' },
      { id: 'com-neighbors', text: 'vecinos', size: 'md' },
      { id: 'com-newcomers', text: 'nuevos', size: 'sm' },
      { id: 'com-elders', text: 'mayores', size: 'sm' },
      { id: 'com-children', text: 'niños', size: 'md' }
    ]
  },
  energy: {
    label: 'energy',
    children: [
      { id: 'ene-solar', text: 'solar', size: 'xl' },
      { id: 'ene-biogas', text: 'biogás', size: 'lg' },
      { id: 'ene-wind', text: 'eólica', size: 'lg' },
      { id: 'ene-storage', text: 'almacenamiento', size: 'md' },
      { id: 'ene-grid', text: 'red', size: 'md' },
      { id: 'ene-efficiency', text: 'eficiencia', size: 'sm' },
      { id: 'ene-consumption', text: 'consumo', size: 'sm' },
      { id: 'ene-heating', text: 'calefacción', size: 'md' }
    ]
  },
  education: {
    label: 'education',
    children: [
      { id: 'edu-children', text: 'infancia', size: 'xl' },
      { id: 'edu-youth', text: 'juventud', size: 'lg' },
      { id: 'edu-adult', text: 'adultos', size: 'lg' },
      { id: 'edu-skills', text: 'oficios', size: 'md' },
      { id: 'edu-languages', text: 'idiomas', size: 'md' },
      { id: 'edu-arts', text: 'artes', size: 'sm' },
      { id: 'edu-science', text: 'ciencias', size: 'sm' },
      { id: 'edu-nature', text: 'naturaleza', size: 'md' }
    ]
  },
  economy: {
    label: 'economy',
    children: [
      { id: 'eco-exchange', text: 'intercambio', size: 'xl' },
      { id: 'eco-currency', text: 'moneda', size: 'lg' },
      { id: 'eco-markets', text: 'mercados', size: 'lg' },
      { id: 'eco-labor', text: 'trabajo', size: 'md' },
      { id: 'eco-resources', text: 'recursos', size: 'md' },
      { id: 'eco-commons', text: 'comunes', size: 'sm' },
      { id: 'eco-external', text: 'externo', size: 'sm' },
      { id: 'eco-accounting', text: 'contabilidad', size: 'xs' }
    ]
  },
  food: {
    label: 'food',
    children: [
      { id: 'food-gardens', text: 'huertos', size: 'xl' },
      { id: 'food-orchards', text: 'frutales', size: 'lg' },
      { id: 'food-livestock', text: 'ganado', size: 'lg' },
      { id: 'food-preservation', text: 'conservas', size: 'md' },
      { id: 'food-kitchen', text: 'cocina', size: 'md' },
      { id: 'food-distribution', text: 'distribución', size: 'sm' },
      { id: 'food-seasons', text: 'estaciones', size: 'sm' },
      { id: 'food-seeds', text: 'semillas', size: 'md' }
    ]
  },
  water: {
    label: 'water',
    children: [
      { id: 'wat-collection', text: 'captación', size: 'xl' },
      { id: 'wat-storage', text: 'almacenaje', size: 'lg' },
      { id: 'wat-treatment', text: 'tratamiento', size: 'lg' },
      { id: 'wat-irrigation', text: 'riego', size: 'md' },
      { id: 'wat-greywater', text: 'aguas grises', size: 'md' },
      { id: 'wat-blackwater', text: 'aguas negras', size: 'sm' },
      { id: 'wat-canals', text: 'canales', size: 'sm' },
      { id: 'wat-quality', text: 'calidad', size: 'xs' }
    ]
  },
  housing: {
    label: 'housing',
    children: [
      { id: 'hou-construction', text: 'construcción', size: 'xl' },
      { id: 'hou-materials', text: 'materiales', size: 'lg' },
      { id: 'hou-design', text: 'diseño', size: 'lg' },
      { id: 'hou-maintenance', text: 'mantenimiento', size: 'md' },
      { id: 'hou-allocation', text: 'asignación', size: 'md' },
      { id: 'hou-shared', text: 'compartido', size: 'sm' },
      { id: 'hou-private', text: 'privado', size: 'sm' },
      { id: 'hou-guests', text: 'huéspedes', size: 'xs' }
    ]
  },
  health: {
    label: 'health',
    children: [
      { id: 'hea-prevention', text: 'prevención', size: 'xl' },
      { id: 'hea-medicine', text: 'medicina', size: 'lg' },
      { id: 'hea-herbs', text: 'hierbas', size: 'lg' },
      { id: 'hea-mental', text: 'mental', size: 'md' },
      { id: 'hea-emergency', text: 'emergencias', size: 'md' },
      { id: 'hea-elderly', text: 'mayores', size: 'sm' },
      { id: 'hea-births', text: 'nacimientos', size: 'sm' },
      { id: 'hea-nutrition', text: 'nutrición', size: 'md' }
    ]
  },
  transport: {
    label: 'transport',
    children: [
      { id: 'tra-paths', text: 'senderos', size: 'xl' },
      { id: 'tra-bikes', text: 'bicicletas', size: 'lg' },
      { id: 'tra-carts', text: 'carretas', size: 'lg' },
      { id: 'tra-vehicles', text: 'vehículos', size: 'md' },
      { id: 'tra-external', text: 'externo', size: 'md' },
      { id: 'tra-logistics', text: 'logística', size: 'sm' }
    ]
  },
  waste: {
    label: 'waste',
    children: [
      { id: 'was-compost', text: 'compost', size: 'xl' },
      { id: 'was-recycling', text: 'reciclaje', size: 'lg' },
      { id: 'was-reduction', text: 'reducción', size: 'lg' },
      { id: 'was-reuse', text: 'reutilización', size: 'md' },
      { id: 'was-hazardous', text: 'peligrosos', size: 'sm' },
      { id: 'was-systems', text: 'sistemas', size: 'sm' }
    ]
  },
  culture: {
    label: 'culture',
    children: [
      { id: 'cul-music', text: 'música', size: 'xl' },
      { id: 'cul-art', text: 'arte', size: 'lg' },
      { id: 'cul-stories', text: 'historias', size: 'lg' },
      { id: 'cul-crafts', text: 'artesanía', size: 'md' },
      { id: 'cul-traditions', text: 'tradiciones', size: 'md' },
      { id: 'cul-spirituality', text: 'espiritualidad', size: 'sm' },
      { id: 'cul-identity', text: 'identidad', size: 'sm' },
      { id: 'cul-heritage', text: 'patrimonio', size: 'xs' }
    ]
  },
  conflict: {
    label: 'conflict',
    children: [
      { id: 'con-mediation', text: 'mediación', size: 'xl' },
      { id: 'con-circles', text: 'círculos', size: 'lg' },
      { id: 'con-agreements', text: 'acuerdos', size: 'lg' },
      { id: 'con-boundaries', text: 'límites', size: 'md' },
      { id: 'con-restoration', text: 'restauración', size: 'md' },
      { id: 'con-prevention', text: 'prevención', size: 'sm' }
    ]
  },
  legal: {
    label: 'legal',
    children: [
      { id: 'leg-structure', text: 'estructura', size: 'xl' },
      { id: 'leg-contracts', text: 'contratos', size: 'lg' },
      { id: 'leg-land', text: 'tierra', size: 'lg' },
      { id: 'leg-permits', text: 'permisos', size: 'md' },
      { id: 'leg-external', text: 'externo', size: 'md' },
      { id: 'leg-bylaws', text: 'estatutos', size: 'sm' }
    ]
  },
  technology: {
    label: 'technology',
    children: [
      { id: 'tec-communication', text: 'comunicación', size: 'xl' },
      { id: 'tec-data', text: 'datos', size: 'lg' },
      { id: 'tec-tools', text: 'herramientas', size: 'lg' },
      { id: 'tec-automation', text: 'automatización', size: 'md' },
      { id: 'tec-monitoring', text: 'monitoreo', size: 'md' },
      { id: 'tec-repair', text: 'reparación', size: 'sm' },
      { id: 'tec-innovation', text: 'innovación', size: 'sm' }
    ]
  },
  // Third level examples
  'gov-decisions': {
    label: 'decisiones',
    children: [
      { id: 'dec-urgent', text: 'urgentes', size: 'xl' },
      { id: 'dec-strategic', text: 'estratégicas', size: 'lg' },
      { id: 'dec-operational', text: 'operativas', size: 'lg' },
      { id: 'dec-reversible', text: 'reversibles', size: 'md' },
      { id: 'dec-consensus', text: 'por consenso', size: 'md' },
      { id: 'dec-delegated', text: 'delegadas', size: 'sm' }
    ]
  },
  'ene-solar': {
    label: 'solar',
    children: [
      { id: 'sol-panels', text: 'paneles', size: 'xl' },
      { id: 'sol-thermal', text: 'térmica', size: 'lg' },
      { id: 'sol-passive', text: 'pasiva', size: 'lg' },
      { id: 'sol-maintenance', text: 'mantenimiento', size: 'md' },
      { id: 'sol-inverters', text: 'inversores', size: 'sm' },
      { id: 'sol-orientation', text: 'orientación', size: 'sm' }
    ]
  },
  'food-gardens': {
    label: 'huertos',
    children: [
      { id: 'gar-annual', text: 'anuales', size: 'xl' },
      { id: 'gar-perennial', text: 'perennes', size: 'lg' },
      { id: 'gar-greenhouse', text: 'invernadero', size: 'lg' },
      { id: 'gar-beds', text: 'bancales', size: 'md' },
      { id: 'gar-rotation', text: 'rotación', size: 'md' },
      { id: 'gar-companions', text: 'asociación', size: 'sm' }
    ]
  }
}

export function UpperRight({ onNavigate, onShowInfo }) {
  const [path, setPath] = useState(['root'])
  const [isTransitioning, setIsTransitioning] = useState(false)

  const currentNodeId = path[path.length - 1]
  const currentNode = TOPIC_TREE[currentNodeId]
  const currentTopics = currentNode?.children || []

  const handleWordClick = useCallback((e, topic) => {
    e.stopPropagation()

    // Check if this topic has children
    if (TOPIC_TREE[topic.id]) {
      setIsTransitioning(true)
      setTimeout(() => {
        setPath(prev => [...prev, topic.id])
        setIsTransitioning(false)
      }, 150)
    } else {
      // Leaf node - show info
      onShowInfo?.(`${topic.text} — sin subtemas`)
    }
  }, [onShowInfo])

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
    } else {
      onNavigate?.('issues-cloud')
    }
  }

  // Build breadcrumb labels
  const breadcrumbLabels = path.map(nodeId =>
    TOPIC_TREE[nodeId]?.label || nodeId
  )

  return (
    <div className="quadrant quadrant-ur" onClick={handleQuadrantClick}>
      <div className="quadrant-header">
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

        <div className={`wordcloud-container ${isTransitioning ? 'transitioning' : ''}`}>
          {currentTopics.map((topic, i) => {
            const hasChildren = !!TOPIC_TREE[topic.id]
            return (
              <span
                key={topic.id}
                className={`word-item word-${topic.size} ${hasChildren ? 'has-children' : ''}`}
                onClick={(e) => handleWordClick(e, topic)}
                style={{ animationDelay: `${i * 30}ms` }}
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
    </div>
  )
}

export default UpperRight
