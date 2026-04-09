/**
 * Dashboard Module
 * Accessed via the central Wilber circle
 * Top bar with tabs, content area below
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

// Tab configuration
const TABS = [
  { id: 'cornucopia', label: 'Cornucopia', icon: '🌽' },
  { id: 'deliberatorium', label: 'Deliberatorium', icon: '🗺️' },
  { id: 'economics', label: 'Economics', icon: '📊' },
  { id: 'wallet', label: 'Wallet', icon: '💰' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

// ═══════════════════════════════════════════
// DELIBERATORIUM — Argument Map
// ═══════════════════════════════════════════

const NODE_TYPES = {
  topic:  { label: 'Topic',          color: '#2a6cb8', bg: 'rgba(42,108,184,0.15)', border: 'rgba(42,108,184,0.5)' },
  question: { label: 'Question',     color: '#c9a227', bg: 'rgba(201,162,39,0.15)', border: 'rgba(201,162,39,0.5)' },
  aspect: { label: 'Aspect',         color: '#9b6bbf', bg: 'rgba(155,107,191,0.15)', border: 'rgba(155,107,191,0.5)' },
  pro:    { label: 'Pro Argument',   color: '#3a9e6e', bg: 'rgba(58,158,110,0.15)', border: 'rgba(58,158,110,0.5)' },
  contra: { label: 'Contra Argument', color: '#c94444', bg: 'rgba(201,68,68,0.15)',  border: 'rgba(201,68,68,0.5)' },
}

const EDGE_TYPES = {
  part_of:    'is part of',
  answers:    'answers',
  supports:   'supports',
  challenges: 'challenges',
}

// Mock argument map about sustainable agriculture
const MOCK_NODES = [
  { id: 'n1',  type: 'topic',    text: 'Sustainable Agriculture',                    x: 480, y: 40 },
  { id: 'n2',  type: 'question', text: 'Should we prioritize permaculture methods?',  x: 200, y: 140 },
  { id: 'n3',  type: 'question', text: 'Should we buy organic inputs?',               x: 520, y: 160 },
  { id: 'n4',  type: 'question', text: 'Should we invest in aquaponics?',             x: 820, y: 140 },
  { id: 'n5',  type: 'aspect',   text: 'Soil health and regeneration',                x: 80,  y: 280 },
  { id: 'n6',  type: 'aspect',   text: 'Cost-effectiveness',                          x: 380, y: 300 },
  { id: 'n7',  type: 'aspect',   text: 'Water management',                            x: 700, y: 280 },
  { id: 'n8',  type: 'pro',      text: 'Permaculture builds long-term soil fertility without external inputs', x: 50, y: 420 },
  { id: 'n9',  type: 'pro',      text: 'Food forests require less labor once established',                     x: 250, y: 440 },
  { id: 'n10', type: 'contra',   text: 'Permaculture yields are lower in the first 3 years',                   x: 100, y: 550 },
  { id: 'n11', type: 'pro',      text: 'Organic inputs improve biodiversity and pollinator habitat',            x: 420, y: 430 },
  { id: 'n12', type: 'contra',   text: 'Certified organic inputs are expensive and hard to source locally',     x: 550, y: 550 },
  { id: 'n13', type: 'pro',      text: 'Aquaponics produces protein and vegetables in a closed loop',          x: 750, y: 420 },
  { id: 'n14', type: 'contra',   text: 'Aquaponics requires significant upfront capital and electricity',       x: 850, y: 550 },
  { id: 'n15', type: 'aspect',   text: 'Labor allocation',                            x: 200, y: 300 },
  { id: 'n16', type: 'pro',      text: 'Local composting eliminates need for purchased fertilizers',            x: 320, y: 560 },
  { id: 'n17', type: 'contra',   text: 'Water-intensive crops strain the shared irrigation system',             x: 680, y: 550 },
]

const MOCK_EDGES = [
  { from: 'n2',  to: 'n1',  type: 'part_of' },
  { from: 'n3',  to: 'n1',  type: 'part_of' },
  { from: 'n4',  to: 'n1',  type: 'part_of' },
  { from: 'n5',  to: 'n2',  type: 'answers' },
  { from: 'n15', to: 'n2',  type: 'answers' },
  { from: 'n6',  to: 'n3',  type: 'answers' },
  { from: 'n7',  to: 'n4',  type: 'answers' },
  { from: 'n8',  to: 'n5',  type: 'supports' },
  { from: 'n9',  to: 'n15', type: 'supports' },
  { from: 'n10', to: 'n8',  type: 'challenges' },
  { from: 'n11', to: 'n6',  type: 'supports' },
  { from: 'n12', to: 'n11', type: 'challenges' },
  { from: 'n16', to: 'n12', type: 'challenges' },
  { from: 'n13', to: 'n7',  type: 'supports' },
  { from: 'n14', to: 'n13', type: 'challenges' },
  { from: 'n17', to: 'n7',  type: 'challenges' },
]

function ArgumentMap() {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [nodes, setNodes] = useState(MOCK_NODES)
  const [selectedNode, setSelectedNode] = useState(null)
  const [dragState, setDragState] = useState(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef(null)

  const nodeMap = useMemo(() => {
    const m = {}
    nodes.forEach(n => { m[n.id] = n })
    return m
  }, [nodes])

  // Drag node
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation()
    setDragState({ nodeId, startX: e.clientX, startY: e.clientY, origNode: nodeMap[nodeId] })
  }, [nodeMap])

  // Pan canvas
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'line' || e.target.tagName === 'text') {
      setIsPanning(true)
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (dragState) {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY
      setNodes(prev => prev.map(n =>
        n.id === dragState.nodeId
          ? { ...n, x: dragState.origNode.x + dx, y: dragState.origNode.y + dy }
          : n
      ))
    } else if (isPanning && panStart.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
    }
  }, [dragState, isPanning])

  const handleMouseUp = useCallback(() => {
    setDragState(null)
    setIsPanning(false)
    panStart.current = null
  }, [])

  // Edge path with label
  const renderEdge = useCallback((edge, i) => {
    const from = nodeMap[edge.from]
    const to = nodeMap[edge.to]
    if (!from || !to) return null

    const fx = from.x + 80, fy = from.y + 18
    const tx = to.x + 80,   ty = to.y + 18
    const mx = (fx + tx) / 2, my = (fy + ty) / 2

    const edgeColor = edge.type === 'challenges' ? 'rgba(201,68,68,0.4)' :
                      edge.type === 'supports' ? 'rgba(58,158,110,0.4)' :
                      'rgba(255,255,255,0.15)'

    return (
      <g key={i}>
        <line x1={fx} y1={fy} x2={tx} y2={ty} stroke={edgeColor} strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        <text x={mx} y={my - 6} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="'Space Mono', monospace">
          {EDGE_TYPES[edge.type]}
        </text>
      </g>
    )
  }, [nodeMap])

  // Node rendering
  const renderNode = useCallback((node) => {
    const style = NODE_TYPES[node.type]
    const isSelected = selectedNode?.id === node.id
    const w = 160, h = 36

    return (
      <g key={node.id}
         transform={`translate(${node.x}, ${node.y})`}
         onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
         onClick={(e) => { e.stopPropagation(); setSelectedNode(isSelected ? null : node) }}
         style={{ cursor: 'grab' }}
      >
        <rect
          x="0" y="0" width={w} height={h} rx="6"
          fill={style.bg}
          stroke={isSelected ? style.color : style.border}
          strokeWidth={isSelected ? 2 : 1}
        />
        {node.type === 'question' && (
          <text x="12" y="23" fill={style.color} fontSize="16" fontWeight="bold">?</text>
        )}
        <text
          x={node.type === 'question' ? 26 : 10} y="14"
          fill="#e8e4d9" fontSize="10" fontFamily="'Space Mono', monospace"
          style={{ dominantBaseline: 'hanging' }}
        >
          {node.text.length > 24 ? (
            <>
              <tspan x={node.type === 'question' ? 26 : 10} dy="0">{node.text.slice(0, 24)}</tspan>
              <tspan x={node.type === 'question' ? 26 : 10} dy="13">{node.text.slice(24, 48)}{node.text.length > 48 ? '...' : ''}</tspan>
            </>
          ) : node.text}
        </text>
      </g>
    )
  }, [selectedNode, handleNodeMouseDown])

  return (
    <div className="delib-tab">
      <header className="delib-header">
        <h1>Deliberatorium</h1>
        <p className="delib-subtitle">Canonical Reasoning Map — structured collective intelligence</p>
      </header>

      {/* Legend */}
      <div className="delib-legend">
        {Object.entries(NODE_TYPES).map(([key, style]) => (
          <div key={key} className="delib-legend-item">
            <span className="delib-legend-dot" style={{ backgroundColor: style.color }} />
            <span className="delib-legend-label">{style.label}</span>
          </div>
        ))}
        <span className="delib-legend-count">Connections: {MOCK_EDGES.length}</span>
      </div>

      {/* Canvas */}
      <div className="delib-canvas" ref={containerRef}
           onMouseMove={handleMouseMove}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
      >
        <svg ref={svgRef} width="100%" height="100%"
             onMouseDown={handleCanvasMouseDown}
             style={{ cursor: isPanning ? 'grabbing' : 'default' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" />
            </marker>
          </defs>
          <g transform={`translate(${pan.x}, ${pan.y})`}>
            {MOCK_EDGES.map(renderEdge)}
            {nodes.map(renderNode)}
          </g>
        </svg>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div className="delib-detail">
          <div className="delib-detail-header">
            <span className="delib-detail-type" style={{ color: NODE_TYPES[selectedNode.type].color }}>
              {NODE_TYPES[selectedNode.type].label}
            </span>
            <button className="delib-detail-close" onClick={() => setSelectedNode(null)}>x</button>
          </div>
          <p className="delib-detail-text">{selectedNode.text}</p>
          <div className="delib-detail-connections">
            <span className="delib-detail-label">Connections</span>
            {MOCK_EDGES.filter(e => e.from === selectedNode.id || e.to === selectedNode.id).map((e, i) => {
              const otherId = e.from === selectedNode.id ? e.to : e.from
              const other = nodeMap[otherId]
              if (!other) return null
              const direction = e.from === selectedNode.id ? '→' : '←'
              return (
                <div key={i} className="delib-connection"
                     onClick={() => setSelectedNode(other)}
                >
                  <span className="conn-dir">{direction}</span>
                  <span className="conn-type">{EDGE_TYPES[e.type]}</span>
                  <span className="conn-target" style={{ color: NODE_TYPES[other.type].color }}>{other.text.slice(0, 40)}{other.text.length > 40 ? '...' : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="delib-footer-note">
        Drag nodes to rearrange. Click a node to inspect connections. Pan the canvas by dragging empty space.
      </p>
    </div>
  )
}

// Helper Components for Economics tab
const WeightBar = ({ label, value, color }) => (
  <div className="weight-bar">
    <div className="weight-label">{label}</div>
    <div className="weight-track">
      <div
        className="weight-fill"
        style={{ width: `${value * 100 * 2}%`, background: color }}
      />
    </div>
    <div className="weight-value">{(value * 100).toFixed(1)}%</div>
  </div>
)

const DualWeightBar = ({ label, actionPercent, weight, color }) => (
  <div className="dual-weight-bar">
    <div className="dual-weight-label">{label}</div>
    <div className="dual-bars">
      <div className="bar-row">
        <span className="bar-type">Action</span>
        <div className="dual-track">
          <div
            className="dual-fill action-fill"
            style={{ width: `${actionPercent}%`, background: color, opacity: 0.6 }}
          />
        </div>
        <span className="bar-value">{actionPercent.toFixed(1)}%</span>
      </div>
      <div className="bar-row">
        <span className="bar-type">Weight</span>
        <div className="dual-track">
          <div
            className="dual-fill weight-fill"
            style={{ width: `${weight * 100 * 2}%`, background: color }}
          />
        </div>
        <span className="bar-value">{(weight * 100).toFixed(1)}%</span>
      </div>
    </div>
  </div>
)

const ActioBar = ({ label, value, color }) => (
  <div className="actio-bar">
    <div className="actio-label">{label}</div>
    <div className="actio-track">
      <div
        className="actio-fill"
        style={{ width: `${value * 100}%`, background: color }}
      />
    </div>
    <div className="actio-value">{(value * 100).toFixed(0)}%</div>
  </div>
)

const DevotioBar = ({ label, value }) => (
  <div className="devotio-bar">
    <div className="devotio-label">{label}</div>
    <div className="devotio-track">
      <div
        className="devotio-fill"
        style={{ width: `${value}%` }}
      />
    </div>
    <div className="devotio-value">{value}</div>
  </div>
)

const getWeightInsight = (period) => {
  const weights = [
    { name: 'Cognitio', value: period.weight_cognitive },
    { name: 'Voluntas', value: period.weight_volitional },
    { name: 'Sympathia', value: period.weight_emotional },
    { name: 'Labor', value: period.weight_physical },
  ]

  const sorted = [...weights].sort((a, b) => b.value - a.value)
  const scarcest = sorted[0]
  const abundant = sorted[3]

  return `${scarcest.name} was scarcest this period (${(scarcest.value * 100).toFixed(1)}% weight), while ${abundant.name} was most abundant (${(abundant.value * 100).toFixed(1)}% weight). Those who contributed ${scarcest.name} get a better exchange rate.`
}

export function Dashboard({ onBack, memberId }) {
  const { signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('cornucopia')

  // Economics tab state
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(null)
  const [summary, setSummary] = useState(null)
  const [devotio, setDevotio] = useState(null)
  const [treasury, setTreasury] = useState([])
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    if (memberId) fetchEconomicData()
  }, [memberId])

  const fetchEconomicData = async () => {
    setLoading(true)
    try {
      // Get latest closed period
      const { data: periodData } = await supabase
        .from('periods')
        .select('*')
        .eq('status', 'closed')
        .order('period_number', { ascending: false })
        .limit(1)
        .single()

      if (periodData) {
        setPeriod(periodData)

        // Get member summary for this period
        const { data: summaryData } = await supabase
          .from('member_period_summary')
          .select('*, members(name, email)')
          .eq('member_id', memberId)
          .eq('period_id', periodData.id)
          .single()

        setSummary(summaryData)

        // Get treasury movements
        const { data: treasuryData } = await supabase
          .from('treasury')
          .select('*')
          .eq('period_id', periodData.id)
          .order('created_at')

        setTreasury(treasuryData || [])
      }

      // Get DEVOTIO profile
      const { data: devotioData } = await supabase
        .from('member_devotio')
        .select('*')
        .eq('member_id', memberId)
        .single()

      setDevotio(devotioData)

    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const handleRedeem = async () => {
    const amount = parseFloat(redeemAmount)
    if (isNaN(amount) || amount <= 0) return

    const available = summary.actions_earned - summary.actions_redeemed
    if (amount > available) {
      alert(`Maximum available: ${available.toFixed(2)}`)
      return
    }

    setRedeeming(true)
    try {
      const { data, error } = await supabase.rpc('redeem_actions', {
        p_member_id: memberId,
        p_period_id: period.id,
        p_actions_to_redeem: amount
      })

      if (error) throw error

      // Refresh data
      await fetchEconomicData()
      setRedeemAmount('')
      alert(`Redeemed ${amount} Actions for ${data[0]?.out_ruban_received?.toFixed(2)} Ruban Cash`)
    } catch (error) {
      console.error('Redemption error:', error)
      alert('Error redeeming: ' + error.message)
    }
    setRedeeming(false)
  }

  const formatPercent = (value) => (value * 100).toFixed(1) + '%'
  const formatNumber = (value, decimals = 2) =>
    value ? parseFloat(value).toFixed(decimals) : '0'

  // Economics tab content
  const renderEconomicsTab = () => {
    if (loading) {
      return <div className="eco-loading">Loading economic data...</div>
    }

    if (!period) {
      return <div className="eco-empty">No closed periods yet</div>
    }

    const available = summary ? summary.actions_earned - summary.actions_redeemed : 0
    const totalIncome = treasury.filter(t => t.amount > 0).reduce((s, t) => s + parseFloat(t.amount), 0)

    return (
      <div className="eco-content">
        <header className="eco-header">
          <h1>Economic Dashboard</h1>
          <p className="eco-subtitle">Period {period.period_number} · {period.status.toUpperCase()}</p>
        </header>

        {/* Treasury Section */}
        <section className="eco-section eco-treasury">
          <h2>Treasury</h2>
          <p className="eco-desc">Funded by surplus production sold at three price tiers: wholesale, local, and visitor.</p>
          <div className="treasury-flow">
            <div className="treasury-sources">
              {treasury.filter(t => t.amount > 0).map((t, i) => (
                <div key={i} className="treasury-item income">
                  <span className="label">{t.movement_type}</span>
                  <span className="value">+{formatNumber(t.amount)}</span>
                </div>
              ))}
            </div>
            <div className="treasury-arrow">→</div>
            <div className="treasury-total">
              <div className="label">Total Income</div>
              <div className="value">${formatNumber(totalIncome)}</div>
            </div>
            <div className="treasury-arrow">→</div>
            <div className="treasury-reserve">
              <div className="label">Reserve (20%)</div>
              <div className="value negative">-${formatNumber(totalIncome * 0.2)}</div>
            </div>
            <div className="treasury-arrow">→</div>
            <div className="treasury-surplus">
              <div className="label">Distributable Surplus</div>
              <div className="value highlight">${formatNumber(period.total_surplus)}</div>
            </div>
          </div>
        </section>

        {/* Surplus Pricing Section */}
        <section className="eco-section eco-pricing-tiers">
          <h2>Surplus Pricing</h2>
          <p className="eco-desc">Locals pay wholesale price. Visitors get a worse exchange rate.</p>
          <div className="pricing-tiers two-tier">
            <div className="tier-card local">
              <div className="tier-label">Local / Wholesale</div>
              <div className="tier-price">₽1.00</div>
              <div className="tier-desc">Members & bulk sales — best price</div>
            </div>
            <div className="tier-card visitor">
              <div className="tier-label">Visitor</div>
              <div className="tier-price">$1.50+</div>
              <div className="tier-desc">Tourists — worse exchange rate</div>
            </div>
          </div>
          <p className="pricing-note">
            Visitor demand affects pricing — higher demand increases their rate. Locals always pay wholesale.
          </p>
        </section>

        {/* Emergent Weights Section */}
        <section className="eco-section eco-weights">
          <h2>Emergent Weights</h2>
          <p className="eco-desc">Scarcity determines value. Less abundant = higher weight.</p>
          {(() => {
            const totalAction = (period.total_cognitive || 0) + (period.total_volitional || 0) +
                               (period.total_emotional || 0) + (period.total_physical || 0)
            const cognitioPercent = totalAction > 0 ? ((period.total_cognitive || 0) / totalAction) * 100 : 25
            const voluntasPercent = totalAction > 0 ? ((period.total_volitional || 0) / totalAction) * 100 : 25
            const sympathiaPercent = totalAction > 0 ? ((period.total_emotional || 0) / totalAction) * 100 : 25
            const laborPercent = totalAction > 0 ? ((period.total_physical || 0) / totalAction) * 100 : 25

            return (
              <div className="weights-grid dual">
                <DualWeightBar
                  label="Cognitio"
                  actionPercent={cognitioPercent}
                  weight={period.weight_cognitive}
                  color="var(--cognitio)"
                />
                <DualWeightBar
                  label="Voluntas"
                  actionPercent={voluntasPercent}
                  weight={period.weight_volitional}
                  color="var(--voluntas)"
                />
                <DualWeightBar
                  label="Sympathia"
                  actionPercent={sympathiaPercent}
                  weight={period.weight_emotional}
                  color="var(--sympathia)"
                />
                <DualWeightBar
                  label="Labor"
                  actionPercent={laborPercent}
                  weight={period.weight_physical}
                  color="var(--labor)"
                />
              </div>
            )
          })()}
          <p className="weights-insight">
            {getWeightInsight(period)}
          </p>
        </section>

        {/* Personal Profile Section */}
        {summary && (
          <section className="eco-section eco-profile">
            <h2>Your Contribution Profile</h2>
            <div className="profile-grid">
              <div className="profile-actio">
                <h3>ACTIO Vector</h3>
                <p className="profile-minutes">{summary.total_minutes} minutes worked</p>
                <div className="actio-bars">
                  <ActioBar
                    label="C"
                    value={summary.weighted_cognitive / summary.total_minutes}
                    color="var(--cognitio)"
                  />
                  <ActioBar
                    label="V"
                    value={summary.weighted_volitional / summary.total_minutes}
                    color="var(--voluntas)"
                  />
                  <ActioBar
                    label="S"
                    value={summary.weighted_emotional / summary.total_minutes}
                    color="var(--sympathia)"
                  />
                  <ActioBar
                    label="L"
                    value={summary.weighted_physical / summary.total_minutes}
                    color="var(--labor)"
                  />
                </div>
              </div>

              {devotio && (
                <div className="profile-devotio">
                  <h3>DEVOTIO Coefficient</h3>
                  <div className="devotio-value">{formatNumber(summary.devotio_coefficient, 2)}×</div>
                  <div className="devotio-bars">
                    <DevotioBar label="Vocatio" value={devotio.vocatio} />
                    <DevotioBar label="Opus" value={devotio.opus} />
                    <DevotioBar label="Societas" value={devotio.societas} />
                    <DevotioBar label="Familia" value={devotio.familia} />
                    <DevotioBar label="Salus" value={devotio.salus} />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Exchange Rate Section */}
        {summary && (
          <section className="eco-section eco-exchange">
            <h2>Personal Exchange Rate</h2>
            <div className="exchange-formula">
              <span className="formula-part" style={{color: 'var(--cognitio)'}}>
                {formatPercent(summary.weighted_cognitive / summary.total_minutes)} × {formatNumber(period.weight_cognitive, 3)}
              </span>
              <span className="formula-op">+</span>
              <span className="formula-part" style={{color: 'var(--voluntas)'}}>
                {formatPercent(summary.weighted_volitional / summary.total_minutes)} × {formatNumber(period.weight_volitional, 3)}
              </span>
              <span className="formula-op">+</span>
              <span className="formula-part" style={{color: 'var(--sympathia)'}}>
                {formatPercent(summary.weighted_emotional / summary.total_minutes)} × {formatNumber(period.weight_emotional, 3)}
              </span>
              <span className="formula-op">+</span>
              <span className="formula-part" style={{color: 'var(--labor)'}}>
                {formatPercent(summary.weighted_physical / summary.total_minutes)} × {formatNumber(period.weight_physical, 3)}
              </span>
              <span className="formula-op">=</span>
              <span className="formula-result">{formatNumber(summary.exchange_rate, 4)}</span>
            </div>
            <p className="exchange-insight">
              Your exchange rate of {formatNumber(summary.exchange_rate, 4)} means each minute worked
              converts to {formatNumber(summary.exchange_rate, 4)} Actions before DEVOTIO.
              {summary.exchange_rate > 0.3
                ? ' Your work aligns well with scarce dimensions.'
                : summary.exchange_rate < 0.2
                  ? ' Your work is concentrated in abundant dimensions.'
                  : ' Your work is distributed across dimensions.'}
            </p>
          </section>
        )}

        {/* Actions & Ruban Section */}
        {summary && (
          <section className="eco-section eco-actions">
            <h2>Actions & Ruban Cash</h2>
            <div className="actions-grid">
              <div className="action-card">
                <div className="card-label">Actions Earned</div>
                <div className="card-value">{formatNumber(summary.actions_earned)}</div>
                <div className="card-formula">
                  {summary.total_minutes} min × {formatNumber(summary.exchange_rate, 4)} × {formatNumber(summary.devotio_coefficient)}
                </div>
              </div>
              <div className="action-card">
                <div className="card-label">Actions Redeemed</div>
                <div className="card-value redeemed">{formatNumber(summary.actions_redeemed)}</div>
              </div>
              <div className="action-card">
                <div className="card-label">Actions Accumulated</div>
                <div className="card-value accumulated">{formatNumber(available)}</div>
                <div className="card-note">Future stake</div>
              </div>
              <div className="action-card highlight">
                <div className="card-label">Ruban Cash Received</div>
                <div className="card-value ruban">₽ {formatNumber(summary.ruban_received)}</div>
              </div>
            </div>

            {/* What Ruban is for */}
            <div className="ruban-uses">
              <h3>What is Ruban Cash for?</h3>
              <div className="uses-grid">
                <div className="use-item">
                  <span className="use-icon">📦</span>
                  <span className="use-text">Buy <strong>surplus production</strong> beyond your Cornucopia allotment</span>
                </div>
                <div className="use-item">
                  <span className="use-icon">💵</span>
                  <span className="use-text">Convert to <strong>USD</strong> for spending outside the local economy</span>
                </div>
              </div>
            </div>

            {/* Redemption UI */}
            <div className="redeem-section">
              <h3>Redeem or Accumulate</h3>
              <p className="redeem-desc">
                Convert Actions to Ruban Cash now, or keep accumulating for a larger future stake in the community.
              </p>
              <div className="redeem-form">
                <input
                  type="number"
                  placeholder="Actions to redeem"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  max={available}
                  step="0.01"
                />
                <span className="available">Available: {formatNumber(available)}</span>
                <button
                  onClick={handleRedeem}
                  disabled={redeeming || !redeemAmount}
                  className="redeem-btn"
                >
                  {redeeming ? 'Processing...' : 'Redeem'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Cycle Visual */}
        <section className="eco-section eco-cycle">
          <h2>The Cycle</h2>
          <div className="cycle-visual">
            <div className="cycle-step">
              <div className="step-num">1</div>
              <div className="step-text">Work</div>
            </div>
            <div className="cycle-arrow">→</div>
            <div className="cycle-step">
              <div className="step-num">2</div>
              <div className="step-text">Register</div>
            </div>
            <div className="cycle-arrow">→</div>
            <div className="cycle-step">
              <div className="step-num">3</div>
              <div className="step-text">Close</div>
            </div>
            <div className="cycle-arrow">→</div>
            <div className="cycle-step active">
              <div className="step-num">4</div>
              <div className="step-text">Decide</div>
            </div>
            <div className="cycle-arrow">→</div>
            <div className="cycle-step">
              <div className="step-num">5</div>
              <div className="step-text">Anchor</div>
            </div>
            <div className="cycle-arrow">↺</div>
          </div>
        </section>

        <footer className="eco-footer">
          <p>"We recognize that human effort has texture, and distribution must honor that texture."</p>
          <span>— Gift Economy 2.0</span>
        </footer>
      </div>
    )
  }

  return (
    <div className="dashboard-view">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-left">
          <button className="topbar-back-btn" onClick={onBack}>
            ←
          </button>
          <div className="topbar-brand">
            <span className="brand-title">C.O.S.</span>
            <span className="brand-subtitle">Dashboard</span>
          </div>
        </div>

        <div className="topbar-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`topbar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="topbar-right">
          <button className="topbar-signout" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="dashboard-content">
        {activeTab === 'cornucopia' && (
          <div className="cornucopia-tab">
            <header className="cornucopia-header">
              <h1>🌽 Cornucopia</h1>
              <p className="cornucopia-subtitle">Customize your weekly food basket from available production</p>
            </header>

            <section className="customize-section">
              <h2>Customize Your Basket</h2>
              <p className="customize-desc">Adjust quantities within available limits. What you don't take becomes surplus.</p>

              <div className="product-list">
                {/* Vegetables */}
                <div className="product-category">
                  <h3>🥬 Vegetables</h3>
                  <div className="product-row">
                    <span className="product-name">Mixed Greens</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="500" step="100" min="0" max="1000" />
                      <span className="qty-unit">g</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 1000g available</span>
                  </div>
                  <div className="product-row">
                    <span className="product-name">Root Vegetables</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="1000" step="250" min="0" max="2000" />
                      <span className="qty-unit">g</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 2000g available</span>
                  </div>
                  <div className="product-row">
                    <span className="product-name">Tomatoes</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="750" step="250" min="0" max="1500" />
                      <span className="qty-unit">g</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 1500g available</span>
                  </div>
                </div>

                {/* Meat */}
                <div className="product-category">
                  <h3>🥩 Meat</h3>
                  <div className="product-row">
                    <span className="product-name">Pastured Beef</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="500" step="100" min="0" max="1000" />
                      <span className="qty-unit">g</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 1000g available</span>
                  </div>
                  <div className="product-row">
                    <span className="product-name">Pastured Chicken</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="1" step="1" min="0" max="2" />
                      <span className="qty-unit">whole</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 2 available</span>
                  </div>
                </div>

                {/* Dairy & Eggs */}
                <div className="product-category">
                  <h3>🥛 Dairy & Eggs</h3>
                  <div className="product-row">
                    <span className="product-name">Fresh Milk</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="2" step="0.5" min="0" max="4" />
                      <span className="qty-unit">L</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 4L available</span>
                  </div>
                  <div className="product-row">
                    <span className="product-name">Yoghurt</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="500" step="250" min="0" max="1000" />
                      <span className="qty-unit">g</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 1000g available</span>
                  </div>
                  <div className="product-row">
                    <span className="product-name">Cheese</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="250" step="50" min="0" max="500" />
                      <span className="qty-unit">g</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 500g available</span>
                  </div>
                  <div className="product-row">
                    <span className="product-name">Eggs</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="12" step="6" min="0" max="24" />
                      <span className="qty-unit">units</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 24 available</span>
                  </div>
                </div>

                {/* Pantry */}
                <div className="product-category">
                  <h3>🍯 Pantry</h3>
                  <div className="product-row">
                    <span className="product-name">Honey</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="250" step="50" min="0" max="500" />
                      <span className="qty-unit">g</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 500g available</span>
                  </div>
                  <div className="product-row">
                    <span className="product-name">Sourdough Bread</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="1" step="1" min="0" max="2" />
                      <span className="qty-unit">loaf</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 2 available</span>
                  </div>
                  <div className="product-row">
                    <span className="product-name">Grains & Flour</span>
                    <div className="product-controls">
                      <button className="qty-btn">−</button>
                      <input type="number" className="qty-input" defaultValue="1000" step="500" min="0" max="2000" />
                      <span className="qty-unit">g</span>
                      <button className="qty-btn">+</button>
                    </div>
                    <span className="product-available">/ 2000g available</span>
                  </div>
                </div>
              </div>

              <div className="basket-actions">
                <button className="btn-save-basket">Save My Basket</button>
                <button className="btn-reset-basket">Reset to Default</button>
              </div>
            </section>

            <section className="pickup-section">
              <h2>Pickup</h2>
              <div className="pickup-info">
                <div className="pickup-detail">
                  <span className="pickup-label">Location</span>
                  <span className="pickup-value">Community Store</span>
                </div>
                <div className="pickup-detail">
                  <span className="pickup-label">Available</span>
                  <span className="pickup-value">Saturday 8am - 12pm</span>
                </div>
                <div className="pickup-detail">
                  <span className="pickup-label">Status</span>
                  <span className="pickup-value status-ready">Ready for pickup</span>
                </div>
              </div>
            </section>

            <p className="cornucopia-note">
              What you don't allocate becomes surplus — sold at wholesale or to visitors.
              You can also trade with other members.
            </p>
          </div>
        )}

        {activeTab === 'deliberatorium' && <ArgumentMap />}

        {activeTab === 'economics' && renderEconomicsTab()}

        {activeTab === 'wallet' && (
          <div className="tab-placeholder">
            <h2>Wallet</h2>
            <p>View your balance and transactions</p>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="tab-placeholder">
            <h2>Calendar</h2>
            <p>View your schedule and commitments</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-placeholder">
            <h2>Settings</h2>
            <p>Configure your preferences</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
