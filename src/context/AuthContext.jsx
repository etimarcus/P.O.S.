/**
 * Authentication Context
 * Manages user authentication state with Supabase
 */

import { createContext, useContext, useState, useEffect } from 'react'
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

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    // Clear dev user if set
    if (user?.isDevUser) {
      setUser(null)
      localStorage.removeItem('devUserId')
      return { error: null }
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Dev mode: set user directly with member ID
  const setDevUser = (memberId) => {
    const devUser = {
      id: memberId,
      email: 'dev@local',
      isDevUser: true
    }
    setUser(devUser)
    localStorage.setItem('devUserId', memberId)
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
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
