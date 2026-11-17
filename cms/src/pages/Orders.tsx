import { useEffect, useState } from 'react'
import type { BulkOrder, OrderStatus } from '../../../src/types'
import { adminApi } from '../adminApi'
import { useStaffAuth } from '../state/StaffAuth'
import { useConfirm } from '../confirm'
import { Button, Card, Field, Input, Notice, PageHeader, Select, Textarea } from '../ui'

const statuses: OrderStatus[] = ['pending', 'payment_review', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled']

export function Orders() {
  const { token } = useStaffAuth()
  const confirm = useConfirm()
  const [orders, setOrders] = useState<BulkOrder[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')

  const load = () => {
    if (!token) return
    void adminApi.orders(token).then(setOrders).catch((e: Error) => setError(e.message))
  }

  useEffect(load, [token])

  const save = async (order: BulkOrder) => {
    if (!token) return
    if (!statuses.includes(order.status)) {
      setError('Choose a valid order status.')
      return
    }
    const ok = await confirm({ title: 'Save order?', message: `Update order ${order.id.slice(0, 8)} to ${order.status.replaceAll('_', ' ')}.`, confirmLabel: 'Save order' })
    if (!ok) return
    setBusyId(order.id)
    setError('')
    try {
      await adminApi.updateOrder(token, order.id, {
        status: order.status,
        staffNotes: order.staffNotes,
        fulfillmentMethod: order.fulfillmentMethod,
      })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId('')
    }
  }

  const visible = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false
    const term = search.toLowerCase()
    if (!term) return true
    return [order.id, order.companyName ?? '', order.deliveryAddress ?? '', order.customerNotes ?? ''].some((v) =>
      v.toLowerCase().includes(term),
    )
  })

  const openProof = async (orderId: string) => {
    if (!token) return
    try {
      const { url } = await adminApi.paymentProofUrl(token, orderId)
      window.open(url, '_blank')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load proof')
    }
  }

  return (
    <div>
      <PageHeader kicker="Commerce" title="Bulk orders inbox" />
      <div className="mb-5 flex flex-wrap gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders" className="max-w-xs" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}>
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      <div className="space-y-5">
        {!visible.length && <p className="text-sm text-ink/50">No bulk orders yet.</p>}
        {visible.map((order) => (
          <Card key={order.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold">{order.id}</p>
                <p className="text-sm text-ink/55">{new Date(order.createdAt).toLocaleString()} · PHP {order.subtotal.toFixed(2)}</p>
                <p className="text-xs text-ink/45">{order.paymentMethod} · {order.fulfillmentMethod}</p>
                {order.companyName && <p className="mt-2 text-sm"><strong>Company:</strong> {order.companyName}</p>}
                {order.deliveryAddress && <p className="text-sm text-ink/60"><strong>Address:</strong> {order.deliveryAddress}</p>}
                {order.customerNotes && <p className="text-sm text-ink/60"><strong>Customer notes:</strong> {order.customerNotes}</p>}
              </div>
              {order.paymentProofUrl && (
                <Button type="button" variant="outline" onClick={() => void openProof(order.id)}>View payment proof</Button>
              )}
            </div>
            <ul className="text-sm text-ink/65">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.colorId}`}>{item.productName}{item.colorName ? ` · ${item.colorName}` : ''} × {item.quantity}</li>
              ))}
            </ul>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Status">
                <Select value={order.status} onChange={(e) => setOrders((list) => list.map((o) => o.id === order.id ? { ...o, status: e.target.value as OrderStatus } : o))}>
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Fulfillment">
                <Select value={order.fulfillmentMethod} onChange={(e) => setOrders((list) => list.map((o) => o.id === order.id ? { ...o, fulfillmentMethod: e.target.value as BulkOrder['fulfillmentMethod'] } : o))}>
                  <option value="lbc">LBC</option>
                  <option value="lalamove">Lalamove</option>
                  <option value="pickup">Pickup</option>
                </Select>
              </Field>
            </div>
            <Field label="Staff notes">
              <Textarea rows={3} value={order.staffNotes ?? ''} onChange={(e) => setOrders((list) => list.map((o) => o.id === order.id ? { ...o, staffNotes: e.target.value } : o))} />
            </Field>
            <Button type="button" disabled={busyId === order.id} onClick={() => void save(orders.find((o) => o.id === order.id)!)}>{busyId === order.id ? 'Saving…' : 'Save order'}</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
