import { randomUUID } from 'node:crypto'
import { createClient, type User } from '@supabase/supabase-js'
import ws from 'ws'
import type { Profile, UserRole } from '../src/types.ts'
import {
  createResetToken,
  hashPassword,
  loadCommerce,
  STAFF_SEEDS,
  updateCommerce,
  type StoredUser,
} from './commerce-store.ts'
import { supabaseServiceConfig } from './env-server.ts'
import { isStaffRole } from './staff-roles.ts'
import { getSupabaseAdmin, isSupabaseTemporarilyDown, noteSupabaseUnavailable } from './supabase-catalog.ts'

const STAFF_ROLES: UserRole[] = ['admin', 'content', 'orders', 'super_admin']

export class StaffError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(5000)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  return fetch(input, { ...init, signal })
}

let seedTask: Promise<void> | null = null
const verifiedTokens = new Map<string, { user: StoredUser; exp: number }>()

function authErrorMessage(error: { message?: string } | null, fallback: string) {
  const message = error?.message ?? fallback
  if (/super_admin|invalid input value for enum user_role/i.test(message)) {
    return 'Supabase is missing the super_admin role. Run supabase/migrations/003_super_admin_role.sql in the SQL editor, then try again.'
  }
  return message
}

function profileFromRow(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    fullName: String(row.full_name ?? 'Staff'),
    phone: row.phone ? String(row.phone) : undefined,
    ageRange: row.age_range ? String(row.age_range) : undefined,
    gender: row.gender ? String(row.gender) : undefined,
    city: row.city ? String(row.city) : undefined,
    province: row.province ? String(row.province) : undefined,
    role: (row.role as UserRole) ?? 'admin',
    createdAt: String(row.created_at ?? new Date().toISOString()),
    lastActiveAt: row.last_active_at ? String(row.last_active_at) : undefined,
  }
}

function storedFromProfile(profile: Profile, password?: string, seedKey?: string): StoredUser {
  return {
    id: profile.id,
    email: profile.email,
    passwordHash: password ? hashPassword(password) : '',
    profile,
    seedKey,
  }
}

function forgetCachedUser(id: string) {
  for (const [token, entry] of verifiedTokens) {
    if (entry.user.id === id) verifiedTokens.delete(token)
  }
}

function anonAuthClient() {
  const { url, anonKey } = supabaseServiceConfig()
  if (!url || !anonKey) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as never },
    global: { fetch: fetchWithTimeout },
  })
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const sb = getSupabaseAdmin()
  if (!sb || isSupabaseTemporarilyDown()) return null
  const target = email.toLowerCase()
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === target)
    if (found) return found
    if (data.users.length < 200) return null
  }
  return null
}

async function upsertProfile(profile: Profile) {
  const sb = getSupabaseAdmin()
  if (!sb) throw new StaffError('Supabase is not configured.', 503)
  const { error } = await sb.from('profiles').upsert({
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    phone: profile.phone ?? null,
    age_range: profile.ageRange ?? null,
    gender: profile.gender ?? null,
    city: profile.city ?? null,
    province: profile.province ?? null,
    role: profile.role,
    last_active_at: new Date().toISOString(),
  })
  if (error) throw new StaffError(authErrorMessage(error, 'Could not save the staff profile.'), 500)
}

async function profileById(id: string): Promise<Profile | null> {
  const sb = getSupabaseAdmin()
  if (!sb || isSupabaseTemporarilyDown()) return null
  const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? profileFromRow(data as Record<string, unknown>) : null
}

async function mirrorLocal(user: StoredUser, password?: string) {
  await updateCommerce((data) => {
    const existing = data.users.find((item) => item.seedKey && item.seedKey === user.seedKey)
      ?? data.users.find((item) => item.id === user.id)
      ?? data.users.find((item) => item.email.toLowerCase() === user.email.toLowerCase())
    if (!existing) {
      data.users.push({ ...user, passwordHash: password ? hashPassword(password) : user.passwordHash })
      return
    }
    existing.email = user.email
    existing.profile = { ...existing.profile, ...user.profile, id: existing.id, email: user.email }
    if (user.seedKey) existing.seedKey = user.seedKey
    if (password) existing.passwordHash = hashPassword(password)
  })
}

async function ensureRemoteSeeds() {
  if (isSupabaseTemporarilyDown() || !getSupabaseAdmin()) return
  if (!seedTask) {
    seedTask = seedRemoteStaff().catch((error) => {
      seedTask = null
      throw error
    })
  }
  try {
    await seedTask
  } catch (error) {
    if (noteSupabaseUnavailable(error)) return
    throw error
  }
}

async function seedRemoteStaff() {
  const sb = getSupabaseAdmin()
  if (!sb) return
  const removed = new Set(loadCommerce().removedSeedKeys ?? [])
  for (const person of STAFF_SEEDS) {
    if (removed.has(person.seedKey)) continue
    let created = false
    let authUser = await findAuthUserByEmail(person.email)
    if (!authUser) {
      const { data, error } = await sb.auth.admin.createUser({
        email: person.email,
        password: person.password,
        email_confirm: true,
        user_metadata: { full_name: person.fullName, seed_key: person.seedKey },
      })
      if (error) {
        authUser = await findAuthUserByEmail(person.email)
        if (!authUser) throw new StaffError(authErrorMessage(error, 'Could not create the staff account.'), 500)
      } else {
        authUser = data.user
        created = true
      }
    }
    if (!authUser) continue
    const current = await profileById(authUser.id)
    const role: UserRole = person.role === 'super_admin'
      ? 'super_admin'
      : current && isStaffRole(current.role) ? current.role : person.role
    const profile: Profile = {
      id: authUser.id,
      email: authUser.email ?? person.email,
      fullName: current?.fullName || String(authUser.user_metadata?.full_name ?? person.fullName),
      role,
      createdAt: current?.createdAt ?? authUser.created_at ?? new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    }
    if (!current || current.role !== role || current.email !== profile.email) await upsertProfile(profile)
    await sb.auth.admin.updateUserById(authUser.id, {
      user_metadata: { ...authUser.user_metadata, full_name: profile.fullName, seed_key: person.seedKey },
    })
    await mirrorLocal(storedFromProfile(profile, undefined, person.seedKey), created ? person.password : undefined)
  }
}

async function remoteStaff(): Promise<StoredUser[] | null> {
  const sb = getSupabaseAdmin()
  if (!sb || isSupabaseTemporarilyDown()) return null
  const { data, error } = await sb.from('profiles').select('*').in('role', STAFF_ROLES)
  if (error) throw error
  return (data ?? []).map((row) => storedFromProfile(profileFromRow(row as Record<string, unknown>)))
}

function localStaff() {
  return loadCommerce().users.filter((user) => isStaffRole(user.profile.role))
}

function mergeStaff(remote: StoredUser[], local: StoredUser[]) {
  const byEmail = new Map<string, StoredUser>()
  for (const user of remote) byEmail.set(user.email.toLowerCase(), user)
  for (const user of local) {
    const key = user.email.toLowerCase()
    if (!byEmail.has(key)) byEmail.set(key, user)
  }
  return [...byEmail.values()]
}

export async function listStaff(): Promise<StoredUser[]> {
  try {
    await ensureRemoteSeeds()
    const remote = await remoteStaff()
    if (remote) return mergeStaff(remote, localStaff())
  } catch (error) {
    if (!noteSupabaseUnavailable(error)) throw error
  }
  return localStaff()
}

async function signIn(email: string, password: string) {
  const client = anonAuthClient()
  if (!client) throw new StaffError('Supabase anon key is missing, so staff cannot sign in.', 503)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    if (/fetch failed|timed out|network|Failed to fetch/i.test(error.message)) throw error
    return null
  }
  return data.session
}

export async function loginStaff(email: string, password: string) {
  try {
    await ensureRemoteSeeds()
    if (!isSupabaseTemporarilyDown() && getSupabaseAdmin()) {
      const remoteUser = await findAuthUserByEmail(email)
      if (remoteUser) {
        const session = await signIn(email, password)
        if (!session) return null
        const profile = await profileById(remoteUser.id)
        if (!profile || !isStaffRole(profile.role)) return null
        profile.lastActiveAt = new Date().toISOString()
        return { userId: profile.id, profile, token: session.access_token }
      }
    }
  } catch (error) {
    if (!noteSupabaseUnavailable(error)) throw error
  }
  const local = loadCommerce().users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  if (!local || local.passwordHash !== hashPassword(password) || !isStaffRole(local.profile.role)) return null
  return { userId: local.id, profile: local.profile, token: local.id }
}

function jwtSubject(token: string) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string }
    return json.sub ?? null
  } catch {
    return null
  }
}

export async function requireStaffUser(token: string | string[] | undefined): Promise<StoredUser | null> {
  if (!token || Array.isArray(token)) return null
  if (token.split('.').length === 3) {
    const cached = verifiedTokens.get(token)
    if (cached && cached.exp > Date.now()) return cached.user
    try {
      const sb = getSupabaseAdmin()
      if (sb && !isSupabaseTemporarilyDown()) {
        const { data, error } = await sb.auth.getUser(token)
        if (error || !data.user) return null
        const profile = await profileById(data.user.id)
        if (!profile || !isStaffRole(profile.role)) return null
        const stored = storedFromProfile(profile)
        verifiedTokens.set(token, { user: stored, exp: Date.now() + 15_000 })
        return stored
      }
    } catch (error) {
      if (!noteSupabaseUnavailable(error)) return null
    }
    const subject = jwtSubject(token)
    const local = subject ? loadCommerce().users.find((user) => user.id === subject && isStaffRole(user.profile.role)) : undefined
    return local ?? null
  }
  return loadCommerce().users.find((user) => user.id === token && isStaffRole(user.profile.role)) ?? null
}

async function emailTaken(email: string, exceptId?: string) {
  const local = loadCommerce().users.some((user) => user.id !== exceptId && user.email.toLowerCase() === email.toLowerCase())
  if (local) return true
  try {
    if (!isSupabaseTemporarilyDown() && getSupabaseAdmin()) {
      const remote = await findAuthUserByEmail(email)
      return Boolean(remote && remote.id !== exceptId)
    }
  } catch (error) {
    if (!noteSupabaseUnavailable(error)) throw error
  }
  return false
}

export async function createEditor(fullName: string, email: string, password: string): Promise<StoredUser> {
  await ensureRemoteSeeds().catch((error) => {
    if (!noteSupabaseUnavailable(error)) throw error
  })
  if (await emailTaken(email)) throw new StaffError('That email is already in use.', 409)
  const sb = getSupabaseAdmin()
  if (sb && !isSupabaseTemporarilyDown()) {
    try {
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (error || !data.user) {
        if (error && /already been registered|already exists/i.test(error.message)) {
          throw new StaffError('That email is already in use.', 409)
        }
        throw new StaffError(authErrorMessage(error, 'Could not create the editor.'), 500)
      }
      const profile: Profile = {
        id: data.user.id,
        email: data.user.email ?? email,
        fullName,
        role: 'admin',
        createdAt: data.user.created_at ?? new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }
      await upsertProfile(profile)
      const stored = storedFromProfile(profile, password)
      await mirrorLocal(stored, password)
      return stored
    } catch (error) {
      if (error instanceof StaffError) throw error
      if (!noteSupabaseUnavailable(error)) throw error
    }
  }
  return updateCommerce((data) => {
    if (data.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      throw new StaffError('That email is already in use.', 409)
    }
    const now = new Date().toISOString()
    const id = randomUUID()
    const profile: Profile = { id, email, fullName, role: 'admin', createdAt: now, lastActiveAt: now }
    const user: StoredUser = { id, email, passwordHash: hashPassword(password), profile }
    data.users.push(user)
    return user
  })
}

export async function updateEditor(id: string, fullName: string, email: string, password?: string): Promise<StoredUser> {
  if (await emailTaken(email, id)) throw new StaffError('That email is already in use.', 409)
  const sb = getSupabaseAdmin()
  if (sb && !isSupabaseTemporarilyDown()) {
    try {
      const profile = await profileById(id)
      if (profile && isStaffRole(profile.role)) {
        if (profile.role === 'super_admin') throw new StaffError('Editor not found.', 404)
        const existingAuth = await sb.auth.admin.getUserById(id)
        const { data, error } = await sb.auth.admin.updateUserById(id, {
          email,
          email_confirm: true,
          ...(password ? { password } : {}),
          user_metadata: { ...existingAuth.data.user?.user_metadata, full_name: fullName },
        })
        if (error) throw new StaffError(authErrorMessage(error, 'Could not update the editor.'), error.message.includes('already') ? 409 : 500)
        const next: Profile = { ...profile, email: data.user.email ?? email, fullName }
        await upsertProfile(next)
        const stored = storedFromProfile(next, password)
        await mirrorLocal(stored, password)
        forgetCachedUser(id)
        return stored
      }
    } catch (error) {
      if (error instanceof StaffError) throw error
      if (!noteSupabaseUnavailable(error)) throw error
    }
  }
  return updateCommerce((data) => {
    const user = data.users.find((item) => item.id === id)
    if (!user || !isStaffRole(user.profile.role) || user.profile.role === 'super_admin') {
      throw new StaffError('Editor not found.', 404)
    }
    if (data.users.some((item) => item.id !== user.id && item.email.toLowerCase() === email.toLowerCase())) {
      throw new StaffError('That email is already in use.', 409)
    }
    user.profile.fullName = fullName
    user.email = email
    user.profile.email = email
    user.pendingEmail = undefined
    user.emailChangeToken = undefined
    user.emailChangeExpires = undefined
    if (password) user.passwordHash = hashPassword(password)
    return user
  })
}

export async function deleteEditor(id: string) {
  const sb = getSupabaseAdmin()
  let seedKey: string | undefined
  let email = ''
  let removedRemote = false
  if (sb && !isSupabaseTemporarilyDown()) {
    try {
      const profile = await profileById(id)
      if (profile?.role === 'super_admin') throw new StaffError('Editor not found.', 404)
      if (profile) email = profile.email
      const { data } = await sb.auth.admin.getUserById(id)
      seedKey = typeof data.user?.user_metadata?.seed_key === 'string' ? data.user.user_metadata.seed_key : undefined
      email = data.user?.email ?? email
      if (data.user) {
        const { error } = await sb.auth.admin.deleteUser(id)
        if (error) throw new StaffError(error.message, 500)
        removedRemote = true
      }
    } catch (error) {
      if (error instanceof StaffError) throw error
      if (!noteSupabaseUnavailable(error)) throw error
    }
  }
  await updateCommerce((data) => {
    const user = data.users.find((item) => item.id === id || (email && item.email.toLowerCase() === email.toLowerCase()))
    if (user?.profile.role === 'super_admin') throw new StaffError('Editor not found.', 404)
    if (!user && !removedRemote) throw new StaffError('Editor not found.', 404)
    if (user && !isStaffRole(user.profile.role)) throw new StaffError('Editor not found.', 404)
    const removedEmail = (email || user?.email || '').toLowerCase()
    seedKey = seedKey ?? user?.seedKey
    data.users = data.users.filter((item) => item.id !== id && item.email.toLowerCase() !== removedEmail)
    if (seedKey) data.removedSeedKeys = [...new Set([...(data.removedSeedKeys ?? []), seedKey])]
  })
  forgetCachedUser(id)
}

export async function renameStaff(id: string, fullName: string): Promise<Profile> {
  const sb = getSupabaseAdmin()
  if (sb && !isSupabaseTemporarilyDown()) {
    try {
      const profile = await profileById(id)
      if (profile && isStaffRole(profile.role)) {
        const next = { ...profile, fullName }
        const existingAuth = await sb.auth.admin.getUserById(id)
        await upsertProfile(next)
        await sb.auth.admin.updateUserById(id, {
          user_metadata: { ...existingAuth.data.user?.user_metadata, full_name: fullName },
        })
        await mirrorLocal(storedFromProfile(next))
        forgetCachedUser(id)
        return next
      }
    } catch (error) {
      if (error instanceof StaffError) throw error
      if (!noteSupabaseUnavailable(error)) throw error
    }
  }
  return updateCommerce((data) => {
    const user = data.users.find((item) => item.id === id)
    if (!user) throw new StaffError('Account not found.', 404)
    user.profile.fullName = fullName
    return user.profile
  })
}

async function passwordMatches(user: StoredUser, password: string) {
  try {
    if (!isSupabaseTemporarilyDown() && getSupabaseAdmin()) {
      const remote = await findAuthUserByEmail(user.email)
      if (remote) return Boolean(await signIn(user.email, password))
    }
  } catch (error) {
    if (!noteSupabaseUnavailable(error)) throw error
  }
  const local = loadCommerce().users.find((item) => item.id === user.id || item.email.toLowerCase() === user.email.toLowerCase())
  return Boolean(local && local.passwordHash === hashPassword(password))
}

export async function requestStaffEmailChange(user: StoredUser, newEmail: string, password: string) {
  if (!(await passwordMatches(user, password))) throw new StaffError('Current password is incorrect.', 401)
  if (newEmail.toLowerCase() === user.email.toLowerCase()) throw new StaffError('That is already your email.', 400)
  if (await emailTaken(newEmail, user.id)) throw new StaffError('That email is already in use.', 409)
  const token = createResetToken()
  const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString()
  await updateCommerce((data) => {
    data.emailChanges = [
      ...(data.emailChanges ?? []).filter((item) => item.userId !== user.id),
      { token, userId: user.id, email: newEmail, expires },
    ]
  })
  return { ok: true as const, confirmToken: token, confirmPath: `/cms/confirm-email?token=${token}` }
}

export async function confirmStaffEmailChange(token: string) {
  const snapshot = loadCommerce()
  const change = snapshot.emailChanges?.find((item) => item.token === token)
  const legacy = snapshot.users.find((item) => item.emailChangeToken === token)
  const userId = change?.userId ?? legacy?.id ?? ''
  const email = change?.email ?? legacy?.pendingEmail ?? ''
  const expires = change?.expires ?? legacy?.emailChangeExpires ?? ''
  if (!userId || !email || !expires || new Date(expires).getTime() < Date.now()) {
    throw new StaffError('Confirmation link is invalid or expired.', 400)
  }
  if (await emailTaken(email, userId)) throw new StaffError('That email is already in use.', 409)
  const sb = getSupabaseAdmin()
  if (sb && !isSupabaseTemporarilyDown()) {
    try {
      const local = loadCommerce().users.find((item) => item.id === userId)
      const authUser = await findAuthUserByEmail(local?.email ?? '')
      const authId = authUser?.id ?? userId
      const profile = await profileById(authId)
      if (profile) {
        const { error } = await sb.auth.admin.updateUserById(authId, { email, email_confirm: true })
        if (error) throw new StaffError(authErrorMessage(error, 'Could not change that email.'), /already/i.test(error.message) ? 409 : 500)
        await upsertProfile({ ...profile, email })
      }
    } catch (error) {
      if (error instanceof StaffError) throw error
      if (!noteSupabaseUnavailable(error)) throw error
    }
  }
  const profile = await updateCommerce((data) => {
    data.emailChanges = (data.emailChanges ?? []).filter((item) => item.token !== token)
    const user = data.users.find((item) => item.id === userId)
    if (!user) return null
    user.email = email
    user.profile.email = email
    user.pendingEmail = undefined
    user.emailChangeToken = undefined
    user.emailChangeExpires = undefined
    return user.profile
  })
  forgetCachedUser(userId)
  return { ok: true as const, userId, profile }
}
