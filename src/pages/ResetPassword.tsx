import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Breadcrumbs, Button } from '../components/UI'
import { commerceApi } from '../lib/commerceApi'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { Seo } from '../components/Seo'

const inputClass = 'min-h-12 w-full border border-ink/20 px-4 font-normal tracking-normal'

function hasRecoveryHint(params: URLSearchParams): boolean {
  if (params.get('type') === 'recovery') return true
  if (params.has('code')) return true
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  return hash.includes('type=recovery') || hash.includes('access_token')
}

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devToken, setDevToken] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  const localResetReady = Boolean(token || devToken)
  const supabaseRecoveryHint = isSupabaseConfigured && hasRecoveryHint(params)

  useEffect(() => {
    if (!supabaseRecoveryHint || localResetReady) return

    let cancelled = false
    setRecoveryLoading(true)

    const supabase = getSupabase()
    const sub = supabase?.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || (session && hasRecoveryHint(params))) {
        setRecoveryReady(true)
        setRecoveryLoading(false)
      }
    })

    void (async () => {
      try {
        await commerceApi.completeAuthRedirect()
        const { data } = await getSupabase()!.auth.getSession()
        if (cancelled) return
        if (data.session) {
          setRecoveryReady(true)
        } else if (hasRecoveryHint(params)) {
          setError('This reset link is invalid or has expired.')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not open reset link')
        }
      } finally {
        if (!cancelled) setRecoveryLoading(false)
      }
    })()

    return () => {
      cancelled = true
      sub?.data.subscription.unsubscribe()
    }
  }, [supabaseRecoveryHint, localResetReady, params])

  const showNewPasswordForm = localResetReady || recoveryReady
  const showRequestForm = !showNewPasswordForm && !recoveryLoading

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

  return (
    <div className="container-site section-space max-w-xl">
      <Seo title="Reset password | Kamaru" />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Reset password' }]} />
      <div className="mt-9 bg-white p-7 md:p-10">
        <h1 className="text-4xl font-extrabold">{showNewPasswordForm ? 'NEW PASSWORD' : 'RESET PASSWORD'}</h1>
        {recoveryLoading && <p className="mt-4 text-sm text-ink/55">Opening your secure reset link…</p>}
        {error && <p className="mt-4 text-sm text-clay">{error}</p>}
        {message && <p className="mt-4 text-sm text-olive">{message}</p>}
        {showRequestForm ? (
          <form onSubmit={(e) => void requestLink(e)} className="mt-7 space-y-4">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
            <Button className="w-full" disabled={busy}>Send reset link</Button>
          </form>
        ) : showNewPasswordForm ? (
          <form onSubmit={(e) => void confirm(e)} className="mt-7 space-y-4">
            <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className={inputClass} />
            <Button className="w-full" disabled={busy || recoveryLoading}>Update password</Button>
          </form>
        ) : null}
        <Link to="/account" className="mt-5 block text-center text-xs font-bold uppercase tracking-wider underline">Back to sign in</Link>
      </div>
    </div>
  )
}
