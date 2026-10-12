import type { BulkOrder, Inquiry, Profile } from '../types'
import { getSupabase, isSupabaseConfigured } from './supabase'

const cmsUrl = String(import.meta.env.VITE_CMS_URL ?? '').replace(/\/$/, '')

async function localRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${cmsUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  return body as T
}

export interface AuthSession {
  userId: string
  profile: Profile
  token?: string
}

const SESSION_KEY = 'kamaru-auth-v1'

export function loadStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) as AuthSession : null
  } catch {
    return null
  }
}

export function saveStoredSession(session: AuthSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

export const commerceApi = {
  async register(input: {
    email: string
    password: string
    fullName: string
    phone?: string
    ageRange?: string
    gender?: string
    city?: string
    province?: string
  }): Promise<AuthSession> {
    if (isSupabaseConfigured) {
      const supabase = getSupabase()!
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.fullName,
            phone: input.phone,
            age_range: input.ageRange,
            gender: input.gender,
            city: input.city,
            province: input.province,
          },
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('Registration failed.')
      const profile: Profile = {
        id: data.user.id,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        ageRange: input.ageRange,
        gender: input.gender,
        city: input.city,
        province: input.province,
        role: 'customer',
        createdAt: new Date().toISOString(),
      }
      await supabase.from('profiles').upsert({
        id: profile.id,
        email: profile.email,
        full_name: profile.fullName,
        phone: profile.phone,
        age_range: profile.ageRange,
        gender: profile.gender,
        city: profile.city,
        province: profile.province,
        role: 'customer',
      })
      const session = { userId: profile.id, profile }
      saveStoredSession(session)
      return session
    }
    const session = await localRequest<AuthSession>('/api/public/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    saveStoredSession(session)
    return session
  },

  async login(email: string, password: string): Promise<AuthSession> {
    if (isSupabaseConfigured) {
      const supabase = getSupabase()!
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('Login failed.')
      const { data: row } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      const profile: Profile = {
        id: data.user.id,
        email: row?.email ?? email,
        fullName: row?.full_name ?? data.user.user_metadata?.full_name ?? 'Member',
        phone: row?.phone,
        ageRange: row?.age_range,
        gender: row?.gender,
        city: row?.city,
        province: row?.province,
        role: row?.role ?? 'customer',
        createdAt: row?.created_at ?? new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }
      const session = { userId: profile.id, profile, token: data.session?.access_token }
      saveStoredSession(session)
      return session
    }
    const session = await localRequest<AuthSession>('/api/public/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    saveStoredSession(session)
    return session
  },

  async logout() {
    if (isSupabaseConfigured) await getSupabase()?.auth.signOut()
    saveStoredSession(null)
  },

  async requestPasswordReset(email: string): Promise<{ devResetToken?: string }> {
    if (isSupabaseConfigured) {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await getSupabase()!.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      return {}
    }
    return localRequest<{ devResetToken?: string }>('/api/public/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async resetPassword(token: string, password: string) {
    if (isSupabaseConfigured) {
      const { error } = await getSupabase()!.auth.updateUser({ password })
      if (error) throw error
      return
    }
    await localRequest('/api/public/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  },

  async listMyOrders(userId: string): Promise<BulkOrder[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await getSupabase()!.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapOrderRow)
    }
    return localRequest<BulkOrder[]>(`/api/public/orders?userId=${encodeURIComponent(userId)}`)
  },

  async createOrder(order: Omit<BulkOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<BulkOrder> {
    if (isSupabaseConfigured) {
      const { data, error } = await getSupabase()!.from('orders').insert({
        user_id: order.userId,
        items: order.items,
        company_name: order.companyName,
        delivery_address: order.deliveryAddress,
        payment_method: order.paymentMethod,
        fulfillment_method: order.fulfillmentMethod,
        payment_proof_url: order.paymentProofUrl,
        customer_notes: order.customerNotes,
        subtotal: order.subtotal,
        status: 'pending',
      }).select('*').single()
      if (error) throw error
      return mapOrderRow(data)
    }
    return localRequest<BulkOrder>('/api/public/orders', { method: 'POST', body: JSON.stringify(order) })
  },

  async submitInquiry(inquiry: Omit<Inquiry, 'id' | 'createdAt'>) {
    if (isSupabaseConfigured) {
      const { error } = await getSupabase()!.from('inquiries').insert(inquiry)
      if (error) throw error
      return
    }
    await localRequest('/api/public/inquiries', { method: 'POST', body: JSON.stringify(inquiry) })
  },

  async uploadPaymentProof(file: File, userId: string): Promise<string> {
    if (isSupabaseConfigured) {
      const supabase = getSupabase()!
      const path = `${userId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('payment-proofs').upload(path, file)
      if (error) throw error
      return path
    }
    const base64 = await fileToDataUrl(file)
    return localRequest<string>('/api/public/upload-proof', {
      method: 'POST',
      body: JSON.stringify({ userId, fileName: file.name, dataUrl: base64 }),
    })
  },
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function mapOrderRow(row: Record<string, unknown>): BulkOrder {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    items: row.items as BulkOrder['items'],
    companyName: row.company_name as string | undefined,
    deliveryAddress: row.delivery_address as string | undefined,
    paymentMethod: row.payment_method as BulkOrder['paymentMethod'],
    fulfillmentMethod: row.fulfillment_method as BulkOrder['fulfillmentMethod'],
    status: row.status as BulkOrder['status'],
    paymentProofUrl: row.payment_proof_url as string | undefined,
    staffNotes: row.staff_notes as string | undefined,
    customerNotes: row.customer_notes as string | undefined,
    subtotal: Number(row.subtotal),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  }
}
