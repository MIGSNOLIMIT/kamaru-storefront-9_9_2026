import type { User } from '@supabase/supabase-js'
import type { Profile } from '../types'
import { getSupabase } from './supabase'

export function profileFromUser(user: User, row?: Record<string, unknown> | null): Profile {
  const meta = user.user_metadata ?? {}
  return {
    id: user.id,
    email: (row?.email as string) ?? user.email ?? '',
    fullName: (row?.full_name as string) ?? (meta.full_name as string) ?? 'Member',
    phone: (row?.phone as string) ?? (meta.phone as string) ?? undefined,
    ageRange: (row?.age_range as string) ?? (meta.age_range as string) ?? undefined,
    gender: (row?.gender as string) ?? (meta.gender as string) ?? undefined,
    city: (row?.city as string) ?? (meta.city as string) ?? undefined,
    province: (row?.province as string) ?? (meta.province as string) ?? undefined,
    role: (row?.role as Profile['role']) ?? 'customer',
    createdAt: (row?.created_at as string) ?? user.created_at ?? new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  }
}

export async function ensureProfile(user: User): Promise<Profile> {
  const supabase = getSupabase()!
  const { data: row } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  const profile = profileFromUser(user, row)
  if (!row) {
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
  }
  return profile
}
