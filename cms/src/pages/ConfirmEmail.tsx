import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Profile } from '../../../src/types'
import { useStaffAuth } from '../state/StaffAuth'
import { Button, Notice } from '../ui'

export function ConfirmEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { staff, updateStaff } = useStaffAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/public/auth/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const body = await res.json() as { error?: string; profile?: Profile }
      if (!res.ok || !body.profile) throw new Error(body.error ?? 'Could not confirm email')
      if (staff?.id === body.profile.id) updateStaff(body.profile)
      setMessage(`Email updated to ${body.profile.email}. Sign in with that address next time.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bone p-6">
      <div className="w-full max-w-md space-y-5 bg-white p-8 shadow-sm">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-clay">KAMARU CMS</p>
          <h1 className="mt-2 text-2xl font-extrabold">Confirm email</h1>
        </div>
        {error && <Notice>{error}</Notice>}
        {message && <p className="text-sm text-olive">{message}</p>}
        {!token && <Notice>This link is missing a confirmation token.</Notice>}
        {token && !message && (
          <>
            <p className="text-sm text-ink/60">Confirming applies the new email. Your current password stays the same.</p>
            <Button type="button" className="w-full" disabled={busy} onClick={() => void confirm()}>Confirm email change</Button>
          </>
        )}
        <Link to="/" className="block text-center text-xs font-bold uppercase tracking-wider underline">Back to CMS</Link>
      </div>
    </div>
  )
}
