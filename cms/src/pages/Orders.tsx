import { useEffect, useState } from 'react'
import type { BulkOrder, OrderStatus } from '../../../src/types'
import { adminApi } from '../adminApi'
import { useStaffAuth } from '../state/StaffAuth'
import { Button, Card, Field, Notice, PageHeader, Select, Textarea } from '../ui'

const statuses: OrderStatus[] = ['pending', 'payment_review', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled']

export function Orders() {
  const { token } = useStaffAuth()
  const [orders, setOrders] = useState<BulkOrder[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = () => {
    if (!token) return
    void adminApi.orders(token).then(setOrders).catch((e: Error) => setError(e.message))
  }

  useEffect(load, [token])

  const save = async (order: BulkOrder) => {
    if (!token) return
    setBusyId(order.id)
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

  return (
    <div>
      <PageHeader kicker="Commerce" title="Bulk orders inbox" />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      <div className="space-y-5">
        {!orders.length && <p className="text-sm text-ink/50">No bulk orders yet.</p>}
        {orders.map((order) => (
          <Card key={order.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold">{order.id}</p>
                <p className="text-sm text-ink/55">{new Date(order.createdAt).toLocaleString()} · PHP {order.subtotal.toFixed(2)}</p>
                <p className="text-xs text-ink/45">{order.paymentMethod} · {order.fulfillmentMethod}</p>
              </div>
              {order.paymentProofUrl && (
                <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-clay">View payment proof</a>
              )}
            </div>
            <ul className="text-sm text-ink/65">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.colorId}`}>{item.productName} × {item.quantity}</li>
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
            <Button type="button" disabled={busyId === order.id} onClick={() => void save(orders.find((o) => o.id === order.id)!)}>Save order</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
