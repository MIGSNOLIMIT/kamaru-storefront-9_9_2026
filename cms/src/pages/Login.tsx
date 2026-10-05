import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useStaffAuth } from '../state/StaffAuth'
import { Button, Field, Input, Notice } from '../ui'

export function Login() {
  const { staff, login } = useStaffAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (staff) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bone p-6">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-md space-y-5 bg-white p-8 shadow-sm">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-clay">KAMARU CMS</p>
          <h1 className="mt-2 text-2xl font-extrabold">Staff sign in</h1>
        </div>
        {error && <Notice>{error}</Notice>}
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        <Link to="/reset-password" className="block text-center text-xs font-bold uppercase tracking-wider underline">Forgot password</Link>
      </form>
    </div>
  )
}
