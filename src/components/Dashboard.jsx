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
  { id: 'actions', label: 'Actions', icon: '⚡' },
  { id: 'wallet', label: 'Wallet', icon: '💰' },
  { id: 'finances', label: 'Finances', icon: '📊' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

// Mock financial data
const TREASURY_DATA = [
  { currency: 'USD', amount: 85000, usdValue: 85000 },
  { currency: 'EUR', amount: 62000, usdValue: 66960 },
  { currency: 'BTC', amount: 1.5, usdValue: 90000 },
  { currency: 'USDT', amount: 5040, usdValue: 5040 },
]

const EXPENSES_DATA = [
  { category: 'Infrastructure', amount: 18000 },
  { category: 'Stipends & Compensation', amount: 15000 },
  { category: 'Materials & Supplies', amount: 9000 },
  { category: 'Energy & Utilities', amount: 7000 },
  { category: 'Maintenance', amount: 5000 },
  { category: 'Administration', amount: 3000 },
]

const REVENUE_DATA = [
  { source: 'Agricultural Products', amount: 52000 },
  { source: 'Workshops & Crafts', amount: 35000 },
  { source: 'Earth School Programs', amount: 28000 },
  { source: 'Hospitality & Tourism', amount: 22000 },
  { source: 'Consulting Services', amount: 15000 },
]

export function Dashboard({ onBack, memberId }) {
  const { signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('actions')
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState([])
  const [accumulated, setAccumulated] = useState({
    totalMinutes: 0,
    cognitive: 0,
    volitional: 0,
    emotional: 0,
    physical: 0
  })

  useEffect(() => {
    if (memberId) fetchActions()
  }, [memberId])

  async function fetchActions() {
    try {
      const { data: actionsData } = await supabase
        .from('actions')
        .select('*, tasks(name, category)')
        .eq('member_id', memberId)
        .order('performed_at', { ascending: false })

      setActions(actionsData || [])

      const acc = (actionsData || []).reduce((sum, action) => ({
        totalMinutes: sum.totalMinutes + action.duration_minutes,
        cognitive: sum.cognitive + (action.cognitive * action.duration_minutes),
        volitional: sum.volitional + (action.volitional * action.duration_minutes),
        emotional: sum.emotional + (action.emotional * action.duration_minutes),
        physical: sum.physical + (action.physical * action.duration_minutes),
      }), { totalMinutes: 0, cognitive: 0, volitional: 0, emotional: 0, physical: 0 })

      setAccumulated(acc)
    } catch (error) {
      console.error('Error fetching actions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatHours = (minutes) => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hrs}h ${mins}m`
  }

  const getPercentages = () => {
    const total = accumulated.cognitive + accumulated.volitional +
                  accumulated.emotional + accumulated.physical
    if (total === 0) return { c: 0, v: 0, e: 0, p: 0 }
    return {
      c: Math.round((accumulated.cognitive / total) * 100),
      v: Math.round((accumulated.volitional / total) * 100),
      e: Math.round((accumulated.emotional / total) * 100),
      p: Math.round((accumulated.physical / total) * 100)
    }
  }

  const pct = getPercentages()

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
        {activeTab === 'actions' && (
          <div className="finances-container">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="summary-card">
                  <h2>Total Contribution</h2>
                  <div className="total-time">{formatHours(accumulated.totalMinutes)}</div>

                  <div className="vector-bars">
                    <div className="vector-row">
                      <span className="vector-label">Cognitio</span>
                      <div className="vector-bar">
                        <div className="vector-fill cognitive" style={{ width: `${pct.c}%` }}></div>
                      </div>
                      <span className="vector-value">{pct.c}%</span>
                    </div>
                    <div className="vector-row">
                      <span className="vector-label">Voluntas</span>
                      <div className="vector-bar">
                        <div className="vector-fill volitional" style={{ width: `${pct.v}%` }}></div>
                      </div>
                      <span className="vector-value">{pct.v}%</span>
                    </div>
                    <div className="vector-row">
                      <span className="vector-label">Sympathia</span>
                      <div className="vector-bar">
                        <div className="vector-fill emotional" style={{ width: `${pct.e}%` }}></div>
                      </div>
                      <span className="vector-value">{pct.e}%</span>
                    </div>
                    <div className="vector-row">
                      <span className="vector-label">Labor</span>
                      <div className="vector-bar">
                        <div className="vector-fill physical" style={{ width: `${pct.p}%` }}></div>
                      </div>
                      <span className="vector-value">{pct.p}%</span>
                    </div>
                  </div>
                </div>

                <div className="actions-list">
                  <h2>Recent Actions</h2>
                  {actions.length === 0 ? (
                    <p>No actions recorded yet</p>
                  ) : (
                    actions.map(action => (
                      <div key={action.id} className="action-item">
                        <div className="action-info">
                          <span className="action-task">{action.tasks?.name || 'Unknown task'}</span>
                          <span className="action-category">{action.tasks?.category}</span>
                        </div>
                        <div className="action-meta">
                          <span className="action-duration">{action.duration_minutes}m</span>
                          <span className="action-date">
                            {new Date(action.performed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="tab-placeholder">
            <h2>Wallet</h2>
            <p>View your balance and transactions</p>
          </div>
        )}

        {activeTab === 'finances' && (() => {
          const totalRevenue = REVENUE_DATA.reduce((sum, i) => sum + i.amount, 0)
          const totalExpenses = EXPENSES_DATA.reduce((sum, i) => sum + i.amount, 0)
          const profit = totalRevenue - totalExpenses
          const treasuryDeduction = Math.round(profit * 0.1)
          const profitAvailable = profit - treasuryDeduction
          const exchangeRate = 0.85
          const rbcIssued = Math.round(profitAvailable * exchangeRate)
          const rbcRedeemed = 65000
          const rbcRemaining = rbcIssued - rbcRedeemed
          const myRbcEntitlement = 4250

          return (
            <div className="finances-tab">
              {/* Treasury - full width */}
              <div className="finance-table-container full-width">
                <h2>Treasury</h2>
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th>Amount</th>
                      <th>USD Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TREASURY_DATA.map(item => (
                      <tr key={item.currency}>
                        <td>{item.currency}</td>
                        <td className="amount">{item.currency === 'BTC' ? item.amount.toFixed(2) : item.amount.toLocaleString()}</td>
                        <td className="amount">${item.usdValue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan="2">Total</td>
                      <td className="amount">${TREASURY_DATA.reduce((sum, i) => sum + i.usdValue, 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Revenue and Expenses side by side */}
              <div className="finances-row">
                <div className="finance-table-container">
                  <h2>Revenue</h2>
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REVENUE_DATA.map(item => (
                        <tr key={item.source}>
                          <td>{item.source}</td>
                          <td className="amount">${item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td>Total Revenue</td>
                        <td className="amount">${totalRevenue.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="finance-table-container">
                  <h2>Expenses</h2>
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EXPENSES_DATA.map(item => (
                        <tr key={item.category}>
                          <td>{item.category}</td>
                          <td className="amount">${item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td>Total Expenses</td>
                        <td className="amount">${totalExpenses.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Profit calculation */}
              <div className="profit-summary">
                <span>Revenue</span>
                <span className="profit-operator">-</span>
                <span>Expenses</span>
                <span className="profit-operator">=</span>
                <span className="profit-result">${profit.toLocaleString()}</span>
              </div>

              {/* Ruban Coin section */}
              <div className="finance-table-container full-width">
                <h2>Ruban Coin</h2>
                <table className="finance-table rbc-table">
                  <tbody>
                    <tr>
                      <td>Profit (USD)</td>
                      <td className="amount">${profit.toLocaleString()}</td>
                    </tr>
                    <tr className="deduction-row">
                      <td>10% Treasury Reserve</td>
                      <td className="amount negative">-${treasuryDeduction.toLocaleString()}</td>
                    </tr>
                    <tr className="subtotal-row">
                      <td>Total Profit Available</td>
                      <td className="amount">${profitAvailable.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>RBC Issued (@ {exchangeRate} USD/RBC)</td>
                      <td className="amount rbc">{rbcIssued.toLocaleString()} RBC</td>
                    </tr>
                    <tr className="deduction-row">
                      <td>RBC Delivered (Redeemed Actions)</td>
                      <td className="amount rbc negative">-{rbcRedeemed.toLocaleString()} RBC</td>
                    </tr>
                    <tr className="subtotal-row">
                      <td>RBC Remaining</td>
                      <td className="amount rbc">{rbcRemaining.toLocaleString()} RBC</td>
                    </tr>
                    <tr className="my-rbc-row">
                      <td>My RBC Entitlement</td>
                      <td className="amount rbc highlight">{myRbcEntitlement.toLocaleString()} RBC</td>
                    </tr>
                  </tbody>
                </table>
                <div className="rbc-actions">
                  <button className="rbc-btn restake">Restake</button>
                  <button className="rbc-btn collect">Collect</button>
                </div>
              </div>
            </div>
          )
        })()}

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
