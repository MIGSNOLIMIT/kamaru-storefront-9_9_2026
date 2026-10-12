import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { BulkOrder, Inquiry, Profile, UserRole } from '../src/types.ts'
import { isStaffRole as checkStaffRole } from './staff-roles.ts'

export interface StoredUser {
  id: string
  email: string
  passwordHash: string
  profile: Profile
  resetToken?: string
  resetExpires?: string
  pendingEmail?: string
  emailChangeToken?: string
  emailChangeExpires?: string
  /** Stable id so a seeded account is not recreated after an email change. */
  seedKey?: string
}

export interface CommerceStore {
  users: StoredUser[]
  orders: BulkOrder[]
  inquiries: Inquiry[]
  /** Seeded accounts a Super admin deleted. Startup will not recreate these. */
  removedSeedKeys?: string[]
}

const dataDir = path.join(import.meta.dirname, 'data')
const commerceFile = path.join(dataDir, 'commerce.json')

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export function createStaffAccount(email: string, password: string, fullName: string, role: UserRole = 'admin'): StoredUser {
  return staffUser(email, password, fullName, role)
}

function staffUser(email: string, password: string, fullName: string, role: UserRole = 'admin', seedKey?: string): StoredUser {
  const now = new Date().toISOString()
  const id = randomUUID()
  return {
    id,
    email,
    passwordHash: hashPassword(password),
    profile: { id, email, fullName, role, createdAt: now, lastActiveAt: now },
    seedKey,
  }
}

function emptyCommerce(): CommerceStore {
  return {
    users: [
      staffUser('admin@kamaru.local', 'kamaru-admin', 'Kamaru Admin', 'super_admin', 'local-admin'),
      staffUser('migsnolimit23@gmail.com', 'Kamaru-Super-2026', 'Migs', 'super_admin', 'migs-23'),
      staffUser('migsnolimit26@gmail.com', 'Kamaru-Migs-2026', 'Migs', 'admin', 'migs-26'),
    ],
    orders: [],
    inquiries: [],
  }
}

function ensureStaffUsers(data: CommerceStore) {
  const required: { email: string; password: string; fullName: string; role: UserRole; seedKey: string }[] = [
    { email: 'admin@kamaru.local', password: 'kamaru-admin', fullName: 'Kamaru Admin', role: 'super_admin', seedKey: 'local-admin' },
    { email: 'migsnolimit23@gmail.com', password: 'Kamaru-Super-2026', fullName: 'Migs', role: 'super_admin', seedKey: 'migs-23' },
    { email: 'migsnolimit26@gmail.com', password: 'Kamaru-Migs-2026', fullName: 'Migs', role: 'admin', seedKey: 'migs-26' },
  ]
  const removed = new Set(data.removedSeedKeys ?? [])
  let changed = false
  for (const person of required) {
    if (removed.has(person.seedKey)) continue
    const existing = data.users.find((user) => user.seedKey === person.seedKey)
      ?? data.users.find((user) => !user.seedKey && user.email.toLowerCase() === person.email.toLowerCase())
    if (!existing) {
      data.users.push(staffUser(person.email, person.password, person.fullName, person.role, person.seedKey))
      changed = true
      continue
    }
    if (existing.seedKey !== person.seedKey) {
      existing.seedKey = person.seedKey
      changed = true
    }
    if (person.role === 'super_admin' && existing.profile.role !== 'super_admin') {
      existing.profile.role = 'super_admin'
      changed = true
    }
  }
  if (changed) saveCommerce(data)
}

export function createResetToken() {
  return randomBytes(24).toString('hex')
}

export function loadCommerce(): CommerceStore {
  if (!existsSync(commerceFile)) {
    const data = emptyCommerce()
    saveCommerce(data)
    return data
  }
  const data = JSON.parse(readFileSync(commerceFile, 'utf8')) as CommerceStore
  ensureStaffUsers(data)
  return data
}

export function saveCommerce(data: CommerceStore) {
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(commerceFile, JSON.stringify(data, null, 2))
}

export function isStaffRole(role: UserRole) {
  return checkStaffRole(role)
}
