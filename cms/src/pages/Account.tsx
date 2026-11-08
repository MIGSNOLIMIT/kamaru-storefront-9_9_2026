import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { UserRole } from '../../../src/types'
import { adminApi } from '../adminApi'
import { useConfirm } from '../confirm'
import { useStaffAuth } from '../state/StaffAuth'
import { Button, Card, Field, Input, Notice, PageHeader } from '../ui'
import { isEmail } from '../validate'

function roleLabel(role: UserRole) {
  return role === 'super_admin' ? 'Super admin' : 'Editor'
}

type StaffRow = { id: string; email: string; fullName: string; role: UserRole; password: string }

export function Account() {
  const { staff, token, updateStaff } = useStaffAuth()
  const confirm = useConfirm()
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

  const applyEditors = (rows: { id: string; email: string; fullName: string; role: UserRole }[], keepCurrent: boolean) => {
    const editors = rows.filter((row) => row.role !== 'super_admin')
    setStaffRows((current) => {
      const drafts = new Map(current.map((row) => [row.id, row]))
      const merged = editors.map((row) => {
        const draft = keepCurrent ? drafts.get(row.id) : undefined
        return {
          id: row.id,
          role: row.role,
          fullName: draft?.fullName ?? row.fullName,
          email: draft?.email ?? row.email,
          password: draft?.password ?? '',
        }
      })
      if (!keepCurrent) return merged
      const seen = new Set(merged.map((row) => row.id))
      return [...merged, ...current.filter((row) => !seen.has(row.id))]
    })
  }

  const loadEditors = (keepCurrent = false) => {
    if (!token) return Promise.resolve()
    return adminApi.staffList(token).then((rows) => applyEditors(rows, keepCurrent))
  }

  useEffect(() => {
    if (!token || !isSuper) return
    void loadEditors().catch((e: Error) => setError(e.message))
  }, [token, isSuper])

  if (!staff || !token) return null

  const saveName = async () => {
    if (!name.trim()) {
      setError('Display name is required.')
      return
    }
    const ok = await confirm({ title: 'Save your name?', message: `Your CMS name will be “${name.trim()}”.`, confirmLabel: 'Save name' })
    if (!ok) return
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
    if (!editorName.trim() || !isEmail(editorEmail) || editorPassword.length < 8) {
      setError('Enter a name, a valid email, and a password of at least 8 characters.')
      return
    }
    const ok = await confirm({ title: 'Add editor?', message: `${editorName.trim()} will be able to sign in as ${editorEmail.trim()}.`, confirmLabel: 'Add editor' })
    if (!ok) return
    setBusy(true)
    setError('')
    setSaved('')
    try {
      await adminApi.createEditor(token, { fullName: editorName, email: editorEmail, password: editorPassword })
      setEditorName('')
      setEditorEmail('')
      setEditorPassword('')
      await loadEditors(true)
      setSaved('Editor added. They can sign in with that email and password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add editor')
    } finally {
      setBusy(false)
    }
  }

  const saveEditor = async (row: StaffRow) => {
    if (!row.fullName.trim() || !isEmail(row.email) || (row.password && row.password.length < 8)) {
      setError('Each editor needs a name, a valid email, and a new password of at least 8 characters if you set one.')
      return
    }
    const ok = await confirm({ title: 'Save editor?', message: `Update ${row.fullName.trim()} (${row.email.trim()}).`, confirmLabel: 'Save editor' })
    if (!ok) return
    setBusy(true)
    setError('')
    setSaved('')
    try {
      await adminApi.updateEditor(token, row.id, {
        fullName: row.fullName,
        email: row.email,
        password: row.password || undefined,
      })
      await loadEditors(true)
      setSaved('Editor saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save editor')
    } finally {
      setBusy(false)
    }
  }

  const removeEditor = async (row: StaffRow) => {
    const ok = await confirm({ title: 'Delete editor?', message: `Delete ${row.fullName}? They will no longer be able to sign in.`, confirmLabel: 'Delete', tone: 'danger' })
    if (!ok) return
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
    if (!isEmail(newEmail) || !password) {
      setError('Enter a valid new email and your current password.')
      return
    }
    const ok = await confirm({ title: 'Change email?', message: `A confirmation link will be created for ${newEmail.trim()}. Sign-in stays on your current email until you open it.`, confirmLabel: 'Continue' })
    if (!ok) return
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
          <Button type="button" disabled={busy || !name.trim()} onClick={() => void saveName()}>{busy ? 'Saving…' : 'Save name'}</Button>
        </Card>

        {isSuper && (
          <Card className="grid gap-4">
            <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">EDITORS</p>
            <p className="text-xs text-ink/45">Each editor is their own Supabase account. Add one here, or change a name, email, and password. Leave the password blank to keep the current one.</p>
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
