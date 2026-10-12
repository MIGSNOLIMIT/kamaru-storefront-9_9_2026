import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { UserRole } from '../../../src/types'
import { adminApi } from '../adminApi'
import { useStaffAuth } from '../state/StaffAuth'
import { Button, Card, Field, Input, Notice, PageHeader } from '../ui'

function roleLabel(role: UserRole) {
  return role === 'super_admin' ? 'Super admin' : 'Editor'
}

type StaffRow = { id: string; email: string; fullName: string; role: UserRole; password: string }

export function Account() {
  const { staff, token, updateStaff } = useStaffAuth()
  const [name, setName] = useState(staff?.fullName ?? '')
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmToken, setConfirmToken] = useState('')
  const [staffRows, setStaffRows] = useState<StaffRow[]>([])
  const [editorName, setEditorName] = useState('')
  const [editorEmail, setEditorEmail] = useState('')
  const [editorPassword, setEditorPassword] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)

  const isSuper = staff?.role === 'super_admin'

  useEffect(() => {
    setName(staff?.fullName ?? '')
  }, [staff?.fullName])

  const loadEditors = () => {
    if (!token) return Promise.resolve()
    return adminApi.staffList(token).then((rows) => {
      setStaffRows(rows.filter((row) => row.role !== 'super_admin').map((row) => ({ ...row, password: '' })))
    })
  }

  useEffect(() => {
    if (!token || !isSuper) return
    void loadEditors().catch((e: Error) => setError(e.message))
  }, [token, isSuper])

  if (!staff || !token) return null

  const saveName = async () => {
    setBusy(true)
    setError('')
    setSaved('')
    try {
      const res = await adminApi.updateOwnName(token, name)
      updateStaff(res.profile)
      setSaved('Name saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save name')
    } finally {
      setBusy(false)
    }
  }

  const addEditor = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSaved('')
    try {
      await adminApi.createEditor(token, { fullName: editorName, email: editorEmail, password: editorPassword })
      setEditorName('')
      setEditorEmail('')
      setEditorPassword('')
      await loadEditors()
      setSaved('Editor added. They can sign in with that email and password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add editor')
    } finally {
      setBusy(false)
    }
  }

  const saveEditor = async (row: StaffRow) => {
    setBusy(true)
    setError('')
    setSaved('')
    try {
      await adminApi.updateEditor(token, row.id, {
        fullName: row.fullName,
        email: row.email,
        password: row.password || undefined,
      })
      await loadEditors()
      setSaved('Editor saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save editor')
    } finally {
      setBusy(false)
    }
  }

  const removeEditor = async (row: StaffRow) => {
    if (!window.confirm(`Delete ${row.fullName}? They will no longer be able to sign in.`)) return
    setBusy(true)
    setError('')
    setSaved('')
    try {
      await adminApi.deleteEditor(token, row.id)
      await loadEditors()
      setSaved('Editor deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete editor')
    } finally {
      setBusy(false)
    }
  }

  const requestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSaved('')
    setConfirmToken('')
    try {
      const res = await adminApi.requestEmailChange(token, newEmail, password)
      setConfirmToken(res.confirmToken)
      setPassword('')
      setSaved('Password confirmed. Open the link below to finish the email change. Sign-in still uses your current email until then.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start email change')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader kicker="Staff" title="Account" />
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {saved && <p className="mb-5 text-sm text-olive">{saved}</p>}
      <div className="grid max-w-3xl gap-6">
        <Card className="grid gap-5">
          <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">YOUR NAME</p>
          <p className="text-xs text-ink/45">Signed in as {staff.email} · {roleLabel(staff.role)}</p>
          <Field label="Display name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button type="button" disabled={busy || !name.trim()} onClick={() => void saveName()}>Save name</Button>
        </Card>

        {isSuper && (
          <Card className="grid gap-4">
            <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">EDITORS</p>
            <p className="text-xs text-ink/45">Add an editor, or change their name, email, and password. Leave the password blank to keep the current one.</p>
            <form onSubmit={(e) => void addEditor(e)} className="grid gap-3 border border-ink/10 p-3">
              <Field label="Name"><Input value={editorName} onChange={(e) => setEditorName(e.target.value)} required /></Field>
              <Field label="Email"><Input type="email" value={editorEmail} onChange={(e) => setEditorEmail(e.target.value)} required /></Field>
              <Field label="Password"><Input type="password" value={editorPassword} onChange={(e) => setEditorPassword(e.target.value)} minLength={8} required /></Field>
              <Button type="submit" disabled={busy}>Add editor</Button>
            </form>
            {staffRows.length === 0 && <p className="text-sm text-ink/45">No editors yet.</p>}
            {staffRows.map((row) => (
              <div key={row.id} className="grid gap-3 border border-ink/10 p-3">
                <Field label="Name">
                  <Input value={row.fullName} onChange={(e) => setStaffRows((list) => list.map((item) => item.id === row.id ? { ...item, fullName: e.target.value } : item))} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={row.email} onChange={(e) => setStaffRows((list) => list.map((item) => item.id === row.id ? { ...item, email: e.target.value } : item))} />
                </Field>
                <Field label="New password">
                  <Input type="password" value={row.password} placeholder="Leave blank to keep the current password" onChange={(e) => setStaffRows((list) => list.map((item) => item.id === row.id ? { ...item, password: e.target.value } : item))} />
                </Field>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={busy || !row.fullName.trim() || !row.email.trim()} onClick={() => void saveEditor(row)}>Save</Button>
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => void removeEditor(row)}>Delete</Button>
                </div>
              </div>
            ))}
          </Card>
        )}

        <Card>
          <form onSubmit={(e) => void requestEmail(e)} className="grid gap-5">
            <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">CHANGE EMAIL</p>
            <p className="text-xs text-ink/45">Enter your current password. The new address is saved only after you open the confirmation link. There is no mail server, so the link is shown here.</p>
            <Field label="New email">
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </Field>
            <Field label="Current password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <Button type="submit" disabled={busy}>Request email change</Button>
            {confirmToken && (
              <p className="text-sm">
                <Link className="font-bold underline" to={`/confirm-email?token=${confirmToken}`}>
                  Confirm email change
                </Link>
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  )
}
