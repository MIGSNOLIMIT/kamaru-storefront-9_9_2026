import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Profile } from '../types'
import { ensureProfile } from '../lib/authProfile'
import { commerceApi, loadStoredSession, saveStoredSession, type AuthSession } from '../lib/commerceApi'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

interface AuthValue {
  user: Profile | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    email: string
    password: string
    fullName: string
    phone?: string
    ageRange?: string
    gender?: string
    city?: string
    province?: string
  }) => Promise<{ needsEmailConfirmation: boolean }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

async function sessionFromSupabaseUser(accessToken?: string): Promise<AuthSession | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return null
  const profile = await ensureProfile(user)
  return {
    userId: profile.id,
    profile,
    token: accessToken ?? data.session?.access_token,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const supabase = getSupabase()!
    let active = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, authSession) => {
      if (!active) return
      if (authSession?.user) {
        try {
          const next = await sessionFromSupabaseUser(authSession.access_token)
          if (next) {
            saveStoredSession(next)
            setSession(next)
          }
        } catch {
          saveStoredSession(null)
          setSession(null)
        }
      } else {
        saveStoredSession(null)
        setSession(null)
      }
    })

    void (async () => {
      try {
        const next = await sessionFromSupabaseUser()
        if (!active) return
        if (next) {
          saveStoredSession(next)
          setSession(next)
        } else {
          saveStoredSession(null)
          setSession(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const next = await commerceApi.login(email, password)
    setSession(next)
  }, [])

  const register = useCallback(async (input: Parameters<AuthValue['register']>[0]) => {
    const result = await commerceApi.register(input)
    if (result.needsEmailConfirmation) {
      return { needsEmailConfirmation: true }
    }
    setSession(result.session)
    return { needsEmailConfirmation: false }
  }, [])

  const logout = useCallback(async () => {
    await commerceApi.logout()
    setSession(null)
  }, [])

  const value = useMemo<AuthValue>(() => ({
    user: session?.profile ?? null,
    loading,
    isAuthenticated: Boolean(session?.profile),
    login,
    register,
    logout,
  }), [session, loading, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
