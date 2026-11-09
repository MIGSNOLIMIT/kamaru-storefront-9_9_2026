import type { BulkOrder, Inquiry, Profile } from '../src/types.ts'
import { getSupabaseAdmin, isSupabaseTemporarilyDown, noteSupabaseUnavailable } from './supabase-catalog.ts'

export type MemberRow = Profile & { orderCount: number }

function client() {
  const sb = getSupabaseAdmin()
  if (!sb || isSupabaseTemporarilyDown()) return null
  return sb
}

function isMissingTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === '42P01' || error.code === 'PGRST205' || /could not find the table|does not exist/i.test(error.message ?? '')))
}

let missingTableWarned = false

/** Runs a Supabase read or write. Returns undefined when Supabase is unreachable or the table is not migrated yet, so callers can use the local file. */
async function remote<T>(work: (sb: NonNullable<ReturnType<typeof client>>) => Promise<{ data: T; error: { code?: string; message: string } | null }>): Promise<T | undefined> {
  const sb = client()
  if (!sb) return undefined
  try {
    const { data, error } = await work(sb)
    if (error) {
      if (isMissingTable(error)) {
        if (!missingTableWarned) {
          missingTableWarned = true
          console.warn('[commerce] A Supabase table is missing. Run supabase/migrations/004_commerce_staff.sql:', error.message)
        }
        return undefined
      }
      throw new Error(error.message)
    }
    return data
  } catch (error) {
    if (noteSupabaseUnavailable(error)) return undefined
    throw error
  }
}

export function mapOrderRow(row: Record<string, unknown>): BulkOrder {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    items: (row.items as BulkOrder['items']) ?? [],
    companyName: (row.company_name as string | null) ?? undefined,
    deliveryAddress: (row.delivery_address as string | null) ?? undefined,
    paymentMethod: row.payment_method as BulkOrder['paymentMethod'],
    fulfillmentMethod: row.fulfillment_method as BulkOrder['fulfillmentMethod'],
    status: row.status as BulkOrder['status'],
    paymentProofUrl: (row.payment_proof_url as string | null) ?? undefined,
    staffNotes: (row.staff_notes as string | null) ?? undefined,
    customerNotes: (row.customer_notes as string | null) ?? undefined,
    subtotal: Number(row.subtotal ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  }
}

function mapProfileRow(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    fullName: String(row.full_name ?? 'Member'),
    phone: (row.phone as string | null) ?? undefined,
    ageRange: (row.age_range as string | null) ?? undefined,
    gender: (row.gender as string | null) ?? undefined,
    city: (row.city as string | null) ?? undefined,
    province: (row.province as string | null) ?? undefined,
    role: 'customer',
    createdAt: String(row.created_at ?? new Date().toISOString()),
    lastActiveAt: (row.last_active_at as string | null) ?? undefined,
  }
}

export async function listOrdersRemote(userId?: string): Promise<BulkOrder[] | undefined> {
  const rows = await remote(async (sb) => {
    let query = sb.from('orders').select('*').order('created_at', { ascending: false })
    if (userId) query = query.eq('user_id', userId)
    return query
  })
  return rows?.map((row) => mapOrderRow(row as Record<string, unknown>))
}

export async function getOrderRemote(id: string): Promise<BulkOrder | null | undefined> {
  const row = await remote(async (sb) => sb.from('orders').select('*').eq('id', id).maybeSingle())
  if (row === undefined) return undefined
  return row ? mapOrderRow(row as Record<string, unknown>) : null
}

export async function updateOrderRemote(id: string, patch: Partial<BulkOrder>): Promise<BulkOrder | null | undefined> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status !== undefined) update.status = patch.status
  if (patch.staffNotes !== undefined) update.staff_notes = patch.staffNotes || null
  if (patch.fulfillmentMethod !== undefined) update.fulfillment_method = patch.fulfillmentMethod
  if (patch.paymentProofUrl !== undefined) update.payment_proof_url = patch.paymentProofUrl || null
  const row = await remote(async (sb) => sb.from('orders').update(update).eq('id', id).select('*').maybeSingle())
  if (row === undefined) return undefined
  return row ? mapOrderRow(row as Record<string, unknown>) : null
}

export async function listMembersRemote(): Promise<MemberRow[] | undefined> {
  const profiles = await remote(async (sb) => sb.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }))
  if (profiles === undefined) return undefined
  const orders = await remote(async (sb) => sb.from('orders').select('user_id'))
  const counts = new Map<string, number>()
  for (const row of orders ?? []) {
    const id = String((row as Record<string, unknown>).user_id)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return (profiles ?? []).map((row) => {
    const profile = mapProfileRow(row as Record<string, unknown>)
    return { ...profile, orderCount: counts.get(profile.id) ?? 0 }
  })
}

export async function listInquiriesRemote(): Promise<Inquiry[] | undefined> {
  const rows = await remote(async (sb) => sb.from('inquiries').select('*').order('created_at', { ascending: false }))
  return rows?.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id),
      name: String(r.name ?? ''),
      email: String(r.email ?? ''),
      subject: String(r.subject ?? ''),
      message: String(r.message ?? ''),
      createdAt: String(r.created_at ?? ''),
    }
  })
}

export async function insertInquiryRemote(inquiry: Omit<Inquiry, 'id' | 'createdAt'>): Promise<Inquiry | undefined> {
  const row = await remote(async (sb) => sb
    .from('inquiries')
    .insert({ name: inquiry.name, email: inquiry.email, subject: inquiry.subject, message: inquiry.message })
    .select('*')
    .single())
  if (!row) return undefined
  const r = row as Record<string, unknown>
  return { ...inquiry, id: String(r.id), createdAt: String(r.created_at) }
}

export async function removedSeedKeysRemote(): Promise<string[] | undefined> {
  const rows = await remote(async (sb) => sb.from('staff_removed_seeds').select('seed_key'))
  return rows?.map((row) => String((row as Record<string, unknown>).seed_key))
}

export async function addRemovedSeedRemote(seedKey: string): Promise<boolean> {
  const done = await remote(async (sb) => {
    const { error } = await sb.from('staff_removed_seeds').upsert({ seed_key: seedKey })
    return { data: true, error }
  })
  return done === true
}

export interface EmailChangeRow {
  token: string
  userId: string
  email: string
  expires: string
}

export async function saveEmailChangeRemote(change: EmailChangeRow): Promise<boolean> {
  const done = await remote(async (sb) => {
    const cleared = await sb.from('staff_email_changes').delete().eq('user_id', change.userId)
    if (cleared.error) return { data: false, error: cleared.error }
    const { error } = await sb.from('staff_email_changes').insert({
      token: change.token,
      user_id: change.userId,
      email: change.email,
      expires_at: change.expires,
    })
    return { data: true, error }
  })
  return done === true
}

export async function findEmailChangeRemote(token: string): Promise<EmailChangeRow | null | undefined> {
  const row = await remote(async (sb) => sb.from('staff_email_changes').select('*').eq('token', token).maybeSingle())
  if (row === undefined) return undefined
  if (!row) return null
  const r = row as Record<string, unknown>
  return { token: String(r.token), userId: String(r.user_id), email: String(r.email), expires: String(r.expires_at) }
}

export async function deleteEmailChangeRemote(token: string) {
  await remote(async (sb) => {
    const { error } = await sb.from('staff_email_changes').delete().eq('token', token)
    return { data: true, error }
  })
}
