/**
 * Upper Right Quadrant - "IT" Exterior Individual
 * Hierarchical Word Cloud for Issues/Topics
 */

import { useState, useCallback, useEffect } from 'react'
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

export function UpperRight({ onNavigate, onShowInfo }) {
  const [path, setPath] = useState(['root'])
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [wordsMap, setWordsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch words from Supabase
  useEffect(() => {
    async function fetchWords() {
      try {
        const { data, error } = await supabase
          .from('word_cloud')
          .select('*')

        if (error) throw error

        // Build a map of id -> word data with children
        const map = {}

        // First pass: create entries for all words
        data.forEach(word => {
          map[word.id] = {
            ...word,
            label: word.word,
            children: []
          }
        })

        // Second pass: populate children arrays
        data.forEach(word => {
          if (word.related_word_ && word.related_word_.length > 0) {
            map[word.id].children = word.related_word_
              .filter(childId => map[childId])
              .map(childId => ({
                id: childId,
                text: map[childId].word,
                size: getSizeFromChildCount(map[childId].related_word_?.length || 0),
                color: map[childId].ministry_color
              }))
          }
        })

        // Find root words (those not referenced as children by any other word)
        const allChildIds = new Set()
        data.forEach(word => {
          if (word.related_word_) {
            word.related_word_.forEach(id => allChildIds.add(id))
          }
        })

        const rootWords = data.filter(word => !allChildIds.has(word.id))

        // Create virtual root node
        map['root'] = {
          label: 'topics',
          children: rootWords.map(word => ({
            id: word.id,
            text: word.word,
            size: getSizeFromChildCount(word.related_word_?.length || 0),
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

  const handleWordClick = useCallback((e, topic) => {
    e.stopPropagation()

    // Check if this topic has children
    if (wordsMap[topic.id]?.children?.length > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setPath(prev => [...prev, topic.id])
        setIsTransitioning(false)
      }, 150)
    } else {
      // Leaf node - show info
      onShowInfo?.(`${topic.text} — sin subtemas`)
    }
  }, [onShowInfo, wordsMap])

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
            const hasChildren = wordsMap[topic.id]?.children?.length > 0
            return (
              <span
                key={topic.id}
                className={`word-item word-${topic.size} ${hasChildren ? 'has-children' : ''}`}
                onClick={(e) => handleWordClick(e, topic)}
                style={{ animationDelay: `${i * 30}ms`, color: topic.color || undefined }}
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
