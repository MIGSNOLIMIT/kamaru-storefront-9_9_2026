import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Breadcrumbs, Button } from '../components/UI'
import { commerceApi } from '../lib/commerceApi'
import { isSupabaseConfigured } from '../lib/supabase'
import { Seo } from '../components/Seo'

const inputClass = 'min-h-12 w-full border border-ink/20 px-4 font-normal tracking-normal'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [email, setEmail] = useState('')
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
      const result = await commerceApi.requestPasswordReset(email)
      if (result.devResetToken) setDevToken(result.devResetToken)
      setMessage(isSupabaseConfigured
        ? 'Check your email for the reset link.'
        : 'Local mode has no mail server, so the reset step is shown below.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start reset')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await commerceApi.resetPassword(token || devToken, password)
      setMessage('Password updated. Sign in with the new password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password')
    } finally {
      setBusy(false)
    }
  }

  const ready = Boolean(token || devToken || isSupabaseConfigured && params.get('type') === 'recovery')

  return (
    <div className="container-site section-space max-w-xl">
      <Seo title="Reset password | Kamaru" />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Reset password' }]} />
      <div className="mt-9 bg-white p-7 md:p-10">
        <h1 className="text-4xl font-extrabold">{ready ? 'NEW PASSWORD' : 'RESET PASSWORD'}</h1>
        {error && <p className="mt-4 text-sm text-clay">{error}</p>}
        {message && <p className="mt-4 text-sm text-olive">{message}</p>}
        {!ready ? (
          <form onSubmit={(e) => void requestLink(e)} className="mt-7 space-y-4">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
            <Button className="w-full" disabled={busy}>Send reset link</Button>
          </form>
        ) : (
          <form onSubmit={(e) => void confirm(e)} className="mt-7 space-y-4">
            <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className={inputClass} />
            <Button className="w-full" disabled={busy}>Update password</Button>
          </form>
        )}
        <Link to="/account" className="mt-5 block text-center text-xs font-bold uppercase tracking-wider underline">Back to sign in</Link>
      </div>
    </div>
  )
}
