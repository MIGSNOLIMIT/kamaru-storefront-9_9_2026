import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Profile } from '../../../src/types'
import { adminApi } from '../adminApi'

interface StaffAuthValue {
  staff: Profile | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const StaffAuthContext = createContext<StaffAuthValue | null>(null)
const KEY = 'kamaru-cms-staff-v1'

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ staff: Profile; token: string } | null>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) as { staff: Profile; token: string } : null
    } catch {
      return null
    }
  })

  const login = async (email: string, password: string) => {
    const res = await adminApi.staffLogin(email, password)
    const next = { staff: res.profile, token: res.token ?? res.userId }
    localStorage.setItem(KEY, JSON.stringify(next))
    setSession(next)
  }

  const logout = () => {
    localStorage.removeItem(KEY)
    setSession(null)
  }

  const value = useMemo<StaffAuthValue>(() => ({
    staff: session?.staff ?? null,
    token: session?.token ?? null,
    login,
    logout,
  }), [session])

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext)
  if (!ctx) throw new Error('useStaffAuth must be used inside StaffAuthProvider')
  return ctx
}
