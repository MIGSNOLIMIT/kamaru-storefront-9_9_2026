import { useEffect, useState } from 'react'
import type { Profile } from '../../../src/types'
import { adminApi } from '../adminApi'
import { useStaffAuth } from '../state/StaffAuth'
import { Card, Notice, PageHeader } from '../ui'

type MemberRow = Profile & { orderCount: number }

export function Members() {
  const { token } = useStaffAuth()
  const [rows, setRows] = useState<MemberRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    void adminApi.members(token).then(setRows).catch((e: Error) => setError(e.message))
  }, [token])

  return (
    <div>
      <PageHeader kicker="Commerce" title="Members" />
      {error && <Notice>{error}</Notice>}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[10px] tracking-[.14em] text-ink/40">
            <tr><th className="pb-3">NAME</th><th className="pb-3">EMAIL</th><th className="pb-3">LOCATION</th><th className="pb-3">ORDERS</th><th className="pb-3">LAST ACTIVE</th></tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-ink/10">
                <td className="py-3 font-bold">{m.fullName}</td>
                <td>{m.email}</td>
                <td>{[m.city, m.province].filter(Boolean).join(', ') || '—'}</td>
                <td>{m.orderCount}</td>
                <td className="text-ink/50">{m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
