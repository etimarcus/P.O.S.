/**
 * Authentication Component
 * Login and Signup forms
 */

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [memberId, setMemberId] = useState('')
  const [showDevMode, setShowDevMode] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp, setDevUser } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setMessage('Check your email to confirm your account')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo">P.O.S.</div>
          <h1>{isLogin ? 'Sign In' : 'Create Account'}</h1>
          <p>People Operating System</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button onClick={() => setIsLogin(false)}>Sign Up</button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button onClick={() => setIsLogin(true)}>Sign In</button>
            </p>
          )}
        </div>

        {/* Dev Mode Toggle */}
        <div className="dev-mode-section">
          <button
            className="dev-mode-toggle"
            onClick={() => setShowDevMode(!showDevMode)}
          >
            {showDevMode ? 'Hide' : 'Dev Mode'}
          </button>

          {showDevMode && (
            <div className="dev-mode-form">
              <input
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Enter Member ID (UUID)"
              />
              <button
                onClick={() => {
                  if (memberId.trim()) {
                    setDevUser(memberId.trim())
                  }
                }}
                disabled={!memberId.trim()}
              >
                Use Member ID
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Auth
