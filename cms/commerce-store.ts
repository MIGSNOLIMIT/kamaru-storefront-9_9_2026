import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { BulkOrder, Inquiry, Profile, UserRole } from '../src/types.ts'

export interface StoredUser {
  id: string
  email: string
  passwordHash: string
  profile: Profile
  resetToken?: string
  resetExpires?: string
}

export interface CommerceStore {
  users: StoredUser[]
  orders: BulkOrder[]
  inquiries: Inquiry[]
}

const dataDir = path.join(import.meta.dirname, 'data')
const commerceFile = path.join(dataDir, 'commerce.json')

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function staffUser(email: string, password: string, fullName: string, role: UserRole = 'admin'): StoredUser {
  const now = new Date().toISOString()
  const id = randomUUID()
  return {
    id,
    email,
    passwordHash: hashPassword(password),
    profile: { id, email, fullName, role, createdAt: now, lastActiveAt: now },
  }
}

function emptyCommerce(): CommerceStore {
  return {
    users: [
      staffUser('admin@kamaru.local', 'kamaru-admin', 'Kamaru Admin'),
      staffUser('migsnolimit26@gmail.com', 'Kamaru-Migs-2026', 'Migs'),
    ],
    orders: [],
    inquiries: [],
  }
}

function ensureStaffUsers(data: CommerceStore) {
  const required = [
    { email: 'admin@kamaru.local', password: 'kamaru-admin', fullName: 'Kamaru Admin' },
    { email: 'migsnolimit26@gmail.com', password: 'Kamaru-Migs-2026', fullName: 'Migs' },
  ]
  let changed = false
  for (const person of required) {
    if (!data.users.some((user) => user.email.toLowerCase() === person.email)) {
      data.users.push(staffUser(person.email, person.password, person.fullName))
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
  return role === 'admin' || role === 'content' || role === 'orders'
}
