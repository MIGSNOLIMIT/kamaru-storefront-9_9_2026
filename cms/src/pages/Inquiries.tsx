import { useEffect, useState } from 'react'
import { adminApi } from '../adminApi'
import { useStaffAuth } from '../state/StaffAuth'
import { Card, Notice, PageHeader } from '../ui'

interface InquiryRow {
  id: string
  name: string
  email: string
  subject: string
  message: string
  created_at?: string
  createdAt?: string
}

export function Inquiries() {
  const { token } = useStaffAuth()
  const [items, setItems] = useState<InquiryRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    void adminApi.inquiries(token).then((rows) => setItems(rows as InquiryRow[])).catch((e: Error) => setError(e.message))
  }, [token])

  return (
    <div>
      <PageHeader kicker="Commerce" title="Contact inquiries" />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      <div className="space-y-4">
        {!items.length && <p className="text-sm text-ink/50">No inquiries yet.</p>}
        {items.map((row) => (
          <Card key={row.id} className="space-y-2 text-sm">
            <p className="font-bold">{row.subject}</p>
            <p className="text-ink/55">
              {row.name} · {row.email} · {new Date(row.created_at ?? row.createdAt ?? '').toLocaleString()}
            </p>
            <p className="leading-6 text-ink/70">{row.message}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
