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
  staffList: (token: string) => request<{ id: string; email: string; fullName: string; role: Profile['role'] }[]>('/api/admin/staff', undefined, token),
  updateOwnName: (token: string, fullName: string) =>
    request<{ profile: Profile }>('/api/admin/account', { method: 'PUT', body: JSON.stringify({ fullName }) }, token),
  createEditor: (token: string, input: { fullName: string; email: string; password: string }) =>
    request<{ id: string; email: string; fullName: string; role: Profile['role'] }>('/api/admin/staff', { method: 'POST', body: JSON.stringify(input) }, token),
  updateEditor: (token: string, id: string, input: { fullName: string; email: string; password?: string }) =>
    request<{ id: string; email: string; fullName: string; role: Profile['role'] }>(`/api/admin/staff/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) }, token),
  deleteEditor: (token: string, id: string) =>
    request<{ ok: true }>(`/api/admin/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }, token),
  requestEmailChange: (token: string, newEmail: string, password: string) =>
    request<{ ok: true; confirmToken: string; confirmPath: string }>('/api/admin/account/email', {
      method: 'POST',
      body: JSON.stringify({ newEmail, password }),
    }, token),
  members: (token: string) => request<(Profile & { orderCount: number })[]>('/api/admin/members', undefined, token),
  orders: (token: string) => request<BulkOrder[]>('/api/admin/orders', undefined, token),
  updateOrder: (token: string, id: string, patch: Partial<BulkOrder>) =>
    request<BulkOrder>(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(patch) }, token),
  inquiries: (token: string) => request<unknown[]>('/api/admin/inquiries', undefined, token),
  paymentProofUrl: (token: string, orderId: string) =>
    request<{ url: string }>(`/api/admin/orders/${encodeURIComponent(orderId)}/payment-proof-url`, undefined, token),
}
