import { useState } from 'react'
import type { ColorOption, Product } from '../../../src/types'
import { api, slugify, type Snapshot } from '../api'
import { useConfirm } from '../confirm'
import { Button, Field, Input, Notice } from '../ui'

function normalizeHex(input: string) {
  const raw = input.trim()
  const hex = raw.startsWith('#') ? raw : `#${raw}`
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex.toLowerCase() : null
}

export function ColorPaletteEditor({
  data,
  product,
  setProduct,
  onPaletteChange,
  paletteOnly = false,
  assignOnly = false,
}: {
  data: Snapshot
  product: Product
  setProduct: (p: Product) => void
  onPaletteChange: (snapshot: Snapshot, syncProductColors?: boolean) => void
  paletteOnly?: boolean
  assignOnly?: boolean
}) {
  const confirm = useConfirm()
  const [newName, setNewName] = useState('')
  const [newHex, setNewHex] = useState('#171717')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editHex, setEditHex] = useState('#171717')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async (syncProductColors = true) => {
    const snapshot = await api.snapshot()
    onPaletteChange(snapshot, paletteOnly ? false : syncProductColors)
  }

  const addColor = async () => {
    const hex = normalizeHex(newHex)
    if (!newName.trim() || !hex) {
      setError('Enter a color name and a valid hex code (#RRGGBB).')
      return
    }
    const ok = await confirm({ title: 'Add color?', message: `Add ${newName.trim()} (${hex}) to the catalog palette.`, confirmLabel: 'Add color' })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await api.createColor(newName.trim(), hex)
      setNewName('')
      setNewHex('#171717')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add color')
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async (id: string) => {
    const hex = normalizeHex(editHex)
    if (!editName.trim() || !hex) {
      setError('Enter a color name and a valid hex code (#RRGGBB).')
      return
    }
    const ok = await confirm({ title: 'Save color?', message: `Update this color to ${editName.trim()} (${hex}). Products using it are updated too.`, confirmLabel: 'Save color' })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await api.updateColor(id, editName.trim(), hex)
      setEditId(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update color')
    } finally {
      setBusy(false)
    }
  }

  const removeColor = async (id: string) => {
    const ok = await confirm({ title: 'Delete color?', message: 'Delete this color from the catalog. It must not be used on any product.', confirmLabel: 'Delete', tone: 'danger' })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await api.deleteColor(id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete color')
    } finally {
      setBusy(false)
    }
  }

  const toggleProductColor = (color: ColorOption, checked: boolean) => {
    if (checked) {
      if (product.colors.some((c) => c.id === color.id)) return
      setProduct({ ...product, colors: [...product.colors, { ...color }] })
    } else {
      setProduct({ ...product, colors: product.colors.filter((c) => c.id !== color.id) })
    }
  }

  return (
    <div className="space-y-4">
      {error && <Notice>{error}</Notice>}
      <div className="space-y-2">
        {data.colors.map((color) => (
          <div key={color.id} className="rounded border border-ink/10 p-3">
            {!paletteOnly && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={product.colors.some((c) => c.id === color.id)}
                  onChange={(e) => toggleProductColor(color, e.target.checked)}
                />
                <span className="size-5 shrink-0 rounded-full border border-black/10" style={{ background: color.hex }} />
                <span className="font-medium">{color.name}</span>
                <span className="text-xs text-ink/45">{color.hex}</span>
              </label>
            )}
            {paletteOnly && (
              <div className="flex items-center gap-2 text-sm">
                <span className="size-5 shrink-0 rounded-full border border-black/10" style={{ background: color.hex }} />
                <span className="font-medium">{color.name}</span>
                <span className="text-xs text-ink/45">{color.hex}</span>
              </div>
            )}
            {!assignOnly && editId === color.id ? (
              <div className="mt-3 grid gap-2 border-t border-ink/10 pt-3">
                <Field label="Name"><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></Field>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Pick color">
                    <input
                      type="color"
                      value={normalizeHex(editHex) ?? '#000000'}
                      onChange={(e) => setEditHex(e.target.value)}
                      className="h-11 w-16 cursor-pointer border border-ink/20 bg-white p-1"
                    />
                  </Field>
                  <Field label="Hex"><Input value={editHex} onChange={(e) => setEditHex(e.target.value)} className="max-w-[8rem]" /></Field>
                </div>
                <div className="flex gap-2">
                  <Button type="button" disabled={busy} onClick={() => void saveEdit(color.id)}>{busy ? 'Saving…' : 'Save color'}</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                </div>
              </div>
            ) : !assignOnly ? (
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditId(color.id)
                    setEditName(color.name)
                    setEditHex(color.hex)
                    setError('')
                  }}
                >
                  Edit
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => void removeColor(color.id)}>
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {!assignOnly && (
      <div className="border-t border-ink/15 pt-4">
        <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">ADD NEW COLOR</p>
        <div className="mt-3 grid gap-3">
          <Field label="Color name"><Input value={newName} placeholder="e.g. Forest Green" onChange={(e) => setNewName(e.target.value)} /></Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Pick color">
              <input
                type="color"
                value={normalizeHex(newHex) ?? '#171717'}
                onChange={(e) => setNewHex(e.target.value)}
                className="h-11 w-16 cursor-pointer border border-ink/20 bg-white p-1"
              />
            </Field>
            <Field label="Hex code">
              <Input value={newHex} onChange={(e) => setNewHex(e.target.value)} placeholder="#596044" className="max-w-[8rem]" />
            </Field>
          </div>
          <p className="text-[10px] text-ink/45">Id preview: {newName.trim() ? slugify(newName) : '—'}</p>
          <Button type="button" disabled={busy || !newName.trim()} onClick={() => void addColor()}>Add to catalog</Button>
        </div>
      </div>
      )}
      {assignOnly && (
        <p className="text-xs text-ink/50">
          Manage palette colors on the <a className="underline" href="/colors">Colors</a> screen.
        </p>
      )}
    </div>
  )
}
