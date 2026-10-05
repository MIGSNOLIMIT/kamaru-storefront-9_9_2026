import type { BulkOrder, Profile } from '../../src/types'

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Kamaru-Staff-Token': token } : {}),
      ...init?.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  return body as T
}

export const adminApi = {
  staffLogin: (email: string, password: string) =>
    request<{ userId: string; profile: Profile; token?: string }>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  members: (token: string) => request<(Profile & { orderCount: number })[]>('/api/admin/members', undefined, token),
  orders: (token: string) => request<BulkOrder[]>('/api/admin/orders', undefined, token),
  updateOrder: (token: string, id: string, patch: Partial<BulkOrder>) =>
    request<BulkOrder>(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(patch) }, token),
  inquiries: (token: string) => request<unknown[]>('/api/admin/inquiries', undefined, token),
}
