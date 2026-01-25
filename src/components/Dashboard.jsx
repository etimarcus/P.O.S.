/**
 * Dashboard Module
 * Accessed via the central Wilber circle
 * Top bar with tabs, content area below
 */

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

// Tab configuration
const TABS = [
  { id: 'economics', label: 'Economics', icon: '📊' },
  { id: 'wallet', label: 'Wallet', icon: '💰' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

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
  const [activeTab, setActiveTab] = useState('economics')

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
              Your profile weighted in scarce dimensions gives you a
              {summary.exchange_rate > 0.25 ? ' favorable' : ' standard'} exchange rate.
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

            {/* Redemption UI */}
            <div className="redeem-section">
              <h3>Redeem or Accumulate</h3>
              <p className="redeem-desc">
                Convert Actions to Ruban Cash (liquidity now), or keep accumulating (larger future stake).
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
            <span className="brand-title">P.O.S.</span>
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
