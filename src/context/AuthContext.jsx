/**
 * Authentication Context
 * Manages user authentication state with Supabase + Google OAuth
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for dev user first
    const devUserId = localStorage.getItem('devUserId')
    if (devUserId) {
      setUser({
        id: devUserId,
        email: 'dev@local',
        isDevUser: true
      })
      setLoading(false)
      return
    }

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't override dev user
      if (!localStorage.getItem('devUserId')) {
        setUser(session?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    // Clear dev user if set
    if (user?.isDevUser) {
      setUser(null)
      localStorage.removeItem('devUserId')
      return { error: null }
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [user])

  // Dev mode: set user directly with member ID
  const setDevUser = useCallback((memberId) => {
    const devUser = {
      id: memberId,
      email: 'dev@local',
      isDevUser: true
    }
    setUser(devUser)
    localStorage.setItem('devUserId', memberId)
  }, [])

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    setDevUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
