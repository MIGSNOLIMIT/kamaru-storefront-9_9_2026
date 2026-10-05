import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Profile } from '../types'
import { commerceApi, loadStoredSession, type AuthSession } from '../lib/commerceApi'
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
  }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function hydrate() {
      if (isSupabaseConfigured) {
        const supabase = getSupabase()!
        const { data } = await supabase.auth.getSession()
        if (!active) return
        if (data.session?.user) {
          const { data: row } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
          if (row) {
            const profile: Profile = {
              id: row.id,
              email: row.email,
              fullName: row.full_name,
              phone: row.phone ?? undefined,
              ageRange: row.age_range ?? undefined,
              gender: row.gender ?? undefined,
              city: row.city ?? undefined,
              province: row.province ?? undefined,
              role: row.role,
              createdAt: row.created_at,
              lastActiveAt: row.last_active_at ?? undefined,
            }
            setSession({ userId: profile.id, profile, token: data.session.access_token })
          }
        } else {
          setSession(null)
        }
      }
      if (active) setLoading(false)
    }
    void hydrate()
    return () => { active = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const next = await commerceApi.login(email, password)
    setSession(next)
  }, [])

  const register = useCallback(async (input: Parameters<AuthValue['register']>[0]) => {
    const next = await commerceApi.register(input)
    setSession(next)
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
