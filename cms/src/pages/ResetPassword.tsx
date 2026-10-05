import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Field, Input, Notice } from '../ui'

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [email, setEmail] = useState('migsnolimit26@gmail.com')
  const [password, setPassword] = useState('')
  const [devToken, setDevToken] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/public/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json() as { error?: string; devResetToken?: string }
      if (!res.ok) throw new Error(body.error ?? 'Could not start reset')
      if (body.devResetToken) setDevToken(body.devResetToken)
      setMessage('If that email exists, a reset link is ready. Local mode shows it below because there is no mail server yet.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/public/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token || devToken, password }),
      })
      const body = await res.json() as { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Could not reset password')
      setMessage('Password updated. You can sign in with the new password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bone p-6">
      <div className="w-full max-w-md space-y-5 bg-white p-8 shadow-sm">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-clay">KAMARU CMS</p>
          <h1 className="mt-2 text-2xl font-extrabold">{token || devToken ? 'Choose a new password' : 'Reset password'}</h1>
        </div>
        {error && <Notice>{error}</Notice>}
        {message && <p className="text-sm text-olive">{message}</p>}
        {!token && !devToken ? (
          <form onSubmit={(e) => void requestLink(e)} className="space-y-4">
            <Field label="Staff email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Button type="submit" className="w-full" disabled={busy}>Send reset link</Button>
          </form>
        ) : (
          <form onSubmit={(e) => void confirm(e)} className="space-y-4">
            <Field label="New password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></Field>
            <Button type="submit" className="w-full" disabled={busy}>Update password</Button>
          </form>
        )}
        {devToken && !token && (
          <p className="text-xs text-ink/55">Local reset token is ready. Set the new password in the form above, or open <Link className="underline" to={`/reset-password?token=${devToken}`}>this link</Link>.</p>
        )}
        <Link to="/" className="block text-center text-xs font-bold uppercase tracking-wider underline">Back to sign in</Link>
      </div>
    </div>
  )
}
