import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Breadcrumbs, Button } from '../components/UI'
import { commerceApi } from '../lib/commerceApi'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../state/AuthContext'
import { Seo } from '../components/Seo'

export default function AuthConfirm() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('error')
      setDetail('Email confirmation requires Supabase. Use local sign-up in dev without Supabase env vars.')
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const session = await commerceApi.completeAuthRedirect()
        if (cancelled) return
        if (session) {
          setStatus('ok')
          setDetail('Your email is confirmed. Taking you to your account…')
          window.setTimeout(() => navigate('/account', { replace: true }), 1500)
        } else {
          setStatus('error')
          setDetail('This confirmation link is invalid or has expired. Sign up again or request a new link from support.')
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setDetail(err instanceof Error ? err.message : 'Could not confirm your email.')
      }
    })()

    return () => { cancelled = true }
  }, [navigate])

  useEffect(() => {
    if (isAuthenticated && status === 'working') {
      setStatus('ok')
      setDetail('You are signed in.')
    }
  }, [isAuthenticated, status])

  return (
    <div className="container-site section-space max-w-xl">
      <Seo title="Confirm email | Kamaru" />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Confirm email' }]} />
      <div className="mt-9 bg-white p-7 md:p-10 text-center">
        <h1 className="text-4xl font-extrabold">EMAIL CONFIRMATION</h1>
        {status === 'working' && (
          <p className="mt-6 text-sm text-ink/55">Confirming your address…</p>
        )}
        {status === 'ok' && (
          <>
            <p className="mt-6 text-sm text-olive">{detail}</p>
            <Link to="/account" className="mt-6 inline-block">
              <Button>Go to account</Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="mt-6 text-sm text-clay">{detail}</p>
            <Link to="/account" className="mt-6 inline-block">
              <Button variant="outline">Back to sign in</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
