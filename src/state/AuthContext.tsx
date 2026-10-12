import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
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

async function sessionFromAuthSession(authSession: Session): Promise<AuthSession | null> {
  const user = authSession.user
  if (!user) return null
  const profile = await ensureProfile(user)
  return {
    userId: profile.id,
    profile,
    token: authSession.access_token,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession())
  const [loading, setLoading] = useState(true)
  const authGeneration = useRef(0)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const supabase = getSupabase()!
    let active = true

    const applySignedOut = () => {
      saveStoredSession(null)
      setSession(null)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!active) return
      const generation = ++authGeneration.current

      if (!authSession?.user) {
        applySignedOut()
        return
      }

      // Never call getSession() inside this callback — it deadlocks Supabase's auth lock.
      window.setTimeout(() => {
        if (!active || generation !== authGeneration.current) return
        void sessionFromAuthSession(authSession)
          .then((next) => {
            if (!active || generation !== authGeneration.current || !next) return
            saveStoredSession(next)
            setSession(next)
          })
          .catch(() => {
            if (!active || generation !== authGeneration.current) return
            applySignedOut()
          })
      }, 0)
    })

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!active) return
        if (data.session) {
          const next = await sessionFromAuthSession(data.session)
          if (next) {
            saveStoredSession(next)
            setSession(next)
          } else {
            applySignedOut()
          }
        } else {
          applySignedOut()
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
    authGeneration.current += 1
    saveStoredSession(null)
    setSession(null)
    await commerceApi.logout()
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
