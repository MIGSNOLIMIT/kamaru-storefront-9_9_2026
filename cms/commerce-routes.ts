import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { BulkOrder, Inquiry, Profile, UserRole } from '../src/types.ts'
import { createResetToken, hashPassword, isStaffRole, loadCommerce, saveCommerce, type StoredUser } from './commerce-store.ts'

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk as Buffer))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function parseBody<T>(req: IncomingMessage): Promise<T> {
  const raw = await readBody(req)
  return raw ? JSON.parse(raw) as T : {} as T
}

function match(pathname: string, pattern: string) {
  const keys: string[] = []
  const regex = new RegExp(`^${pattern.replace(/:([^/]+)/g, (_, key: string) => {
    keys.push(key)
    return '([^/]+)'
  })}$`)
  const found = pathname.match(regex)
  if (!found) return null
  return Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]))
}

function toSession(user: StoredUser) {
  return {
    userId: user.id,
    profile: user.profile,
    token: user.id,
  }
}

export function requireStaff(req: IncomingMessage): StoredUser | null {
  const token = req.headers['x-kamaru-staff-token']
  if (!token || Array.isArray(token)) return null
  const commerce = loadCommerce()
  const user = commerce.users.find((u) => u.id === token)
  if (!user || !isStaffRole(user.profile.role)) return null
  return user
}

export async function handleCommerceRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams,
): Promise<boolean> {
  if (method === 'POST' && pathname === '/api/public/auth/register') {
    const body = await parseBody<{
      email: string
      password: string
      fullName: string
      phone?: string
      ageRange?: string
      gender?: string
      city?: string
      province?: string
    }>(req)
    const commerce = loadCommerce()
    if (commerce.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      send(res, 409, { error: 'Email already registered.' })
      return true
    }
    const id = randomUUID()
    const now = new Date().toISOString()
    const profile: Profile = {
      id,
      email: body.email,
      fullName: body.fullName,
      phone: body.phone,
      ageRange: body.ageRange,
      gender: body.gender,
      city: body.city,
      province: body.province,
      role: 'customer',
      createdAt: now,
      lastActiveAt: now,
    }
    const user: StoredUser = { id, email: body.email, passwordHash: hashPassword(body.password), profile }
    commerce.users.push(user)
    saveCommerce(commerce)
    send(res, 201, toSession(user))
    return true
  }

  if (method === 'POST' && pathname === '/api/public/auth/login') {
    const body = await parseBody<{ email: string; password: string }>(req)
    const commerce = loadCommerce()
    const user = commerce.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase())
    if (!user || user.passwordHash !== hashPassword(body.password)) {
      send(res, 401, { error: 'Invalid email or password.' })
      return true
    }
    user.profile.lastActiveAt = new Date().toISOString()
    saveCommerce(commerce)
    send(res, 200, toSession(user))
    return true
  }

  if (method === 'POST' && pathname === '/api/public/auth/forgot') {
    const body = await parseBody<{ email: string }>(req)
    const commerce = loadCommerce()
    const user = commerce.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase())
    if (user) {
      user.resetToken = createResetToken()
      user.resetExpires = new Date(Date.now() + 1000 * 60 * 30).toISOString()
      saveCommerce(commerce)
      send(res, 200, { ok: true, devResetToken: user.resetToken })
      return true
    }
    send(res, 200, { ok: true })
    return true
  }

  if (method === 'POST' && pathname === '/api/public/auth/reset') {
    const body = await parseBody<{ token: string; password: string }>(req)
    if (!body.password || body.password.length < 8) {
      send(res, 400, { error: 'Password must be at least 8 characters.' })
      return true
    }
    const commerce = loadCommerce()
    const user = commerce.users.find((u) => u.resetToken && u.resetToken === body.token)
    if (!user || !user.resetExpires || new Date(user.resetExpires).getTime() < Date.now()) {
      send(res, 400, { error: 'Reset link is invalid or expired.' })
      return true
    }
    user.passwordHash = hashPassword(body.password)
    user.resetToken = undefined
    user.resetExpires = undefined
    saveCommerce(commerce)
    send(res, 200, { ok: true })
    return true
  }

  if (method === 'GET' && pathname === '/api/public/orders') {
    const userId = searchParams.get('userId')
    if (!userId) {
      send(res, 400, { error: 'userId required' })
      return true
    }
    const commerce = loadCommerce()
    send(res, 200, commerce.orders.filter((o) => o.userId === userId))
    return true
  }

  if (method === 'POST' && pathname === '/api/public/orders') {
    const body = await parseBody<Omit<BulkOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>>(req)
    const commerce = loadCommerce()
    const now = new Date().toISOString()
    const order: BulkOrder = {
      ...body,
      id: randomUUID(),
      status: body.paymentMethod === 'pickup' ? 'confirmed' : 'payment_review',
      createdAt: now,
      updatedAt: now,
    }
    commerce.orders.unshift(order)
    saveCommerce(commerce)
    send(res, 201, order)
    return true
  }

  if (method === 'POST' && pathname === '/api/public/inquiries') {
    const body = await parseBody<Omit<Inquiry, 'id' | 'createdAt'>>(req)
    const commerce = loadCommerce()
    const inquiry: Inquiry = { ...body, id: randomUUID(), createdAt: new Date().toISOString() }
    commerce.inquiries.unshift(inquiry)
    saveCommerce(commerce)
    send(res, 201, inquiry)
    return true
  }

  if (method === 'POST' && pathname === '/api/public/upload-proof') {
    const body = await parseBody<{ userId: string; fileName: string; dataUrl: string }>(req)
    send(res, 200, body.dataUrl)
    return true
  }

  if (method === 'POST' && pathname === '/api/admin/auth/login') {
    const body = await parseBody<{ email: string; password: string }>(req)
    const commerce = loadCommerce()
    const user = commerce.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase())
    if (!user || user.passwordHash !== hashPassword(body.password) || !isStaffRole(user.profile.role)) {
      send(res, 401, { error: 'Staff login failed.' })
      return true
    }
    send(res, 200, toSession(user))
    return true
  }

  if (method === 'GET' && pathname === '/api/admin/members') {
    if (!requireStaff(req)) {
      send(res, 401, { error: 'Unauthorized' })
      return true
    }
    const commerce = loadCommerce()
    const members = commerce.users
      .filter((u) => u.profile.role === 'customer')
      .map((u) => ({
        ...u.profile,
        orderCount: commerce.orders.filter((o) => o.userId === u.id).length,
      }))
    send(res, 200, members)
    return true
  }

  if (method === 'GET' && pathname === '/api/admin/orders') {
    if (!requireStaff(req)) {
      send(res, 401, { error: 'Unauthorized' })
      return true
    }
    send(res, 200, loadCommerce().orders)
    return true
  }

  const adminOrder = match(pathname, '/api/admin/orders/:id')
  if (adminOrder && method === 'PUT') {
    if (!requireStaff(req)) {
      send(res, 401, { error: 'Unauthorized' })
      return true
    }
    const body = await parseBody<Partial<BulkOrder>>(req)
    const commerce = loadCommerce()
    const index = commerce.orders.findIndex((o) => o.id === adminOrder.id)
    if (index < 0) {
      send(res, 404, { error: 'Order not found' })
      return true
    }
    commerce.orders[index] = {
      ...commerce.orders[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }
    saveCommerce(commerce)
    send(res, 200, commerce.orders[index])
    return true
  }

  if (method === 'GET' && pathname === '/api/admin/inquiries') {
    if (!requireStaff(req)) {
      send(res, 401, { error: 'Unauthorized' })
      return true
    }
    send(res, 200, loadCommerce().inquiries)
    return true
  }

  if (method === 'PUT' && pathname === '/api/admin/users/:id/role') {
    send(res, 501, { error: 'Role updates via Supabase dashboard in production.' })
    return true
  }

  return false
}

export function staffCanManageOrders(role: UserRole) {
  return role === 'super_admin' || role === 'admin' || role === 'orders'
}

export function staffCanManageContent(role: UserRole) {
  return role === 'super_admin' || role === 'admin' || role === 'content'
}
