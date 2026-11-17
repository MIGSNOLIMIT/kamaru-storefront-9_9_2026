import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ColorOption, Product } from '../../../src/types'
import { api, type Snapshot } from '../api'
import { useConfirm } from '../confirm'
import { Button, Field, Input, Notice, Textarea } from '../ui'

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
  const [newDescription, setNewDescription] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editHex, setEditHex] = useState('#171717')
  const [editDescription, setEditDescription] = useState('')
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
      await api.createColor(newName.trim(), hex, newDescription.trim() || undefined)
      setNewName('')
      setNewHex('#171717')
      setNewDescription('')
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
      await api.updateColor(id, editName.trim(), hex, editDescription.trim() || undefined)
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
      setProduct({
        ...product,
        colors: product.colors.filter((c) => c.id !== color.id),
        images: product.images.map((image) => (image.colorId === color.id ? { ...image, colorId: undefined } : image)),
      })
    }
  }

  const selected = (color: ColorOption) => product.colors.some((item) => item.id === color.id)

  return (
    <div className="space-y-5">
      {error && <Notice>{error}</Notice>}
      {assignOnly && (
        <p className="text-sm text-ink/55">
          Choose the colors this product is sold in. Add a new swatch on the <Link className="font-bold underline" to="/colors">Colors</Link> tab first.
        </p>
      )}
      {!assignOnly && (
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <p className="text-sm font-bold">Add a color</p>
          <p className="mt-1 text-xs text-ink/50">Saved colors stay on this tab and can be picked while creating or editing a product.</p>
          <div className="mt-4 grid gap-3">
            <Field label="Color name"><Input value={newName} placeholder="Forest Green" onChange={(e) => setNewName(e.target.value)} /></Field>
            <Field label="Description"><Textarea rows={2} value={newDescription} placeholder="Matte finish, shown on the product photo" onChange={(e) => setNewDescription(e.target.value)} /></Field>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Color">
                <input
                  type="color"
                  aria-label="Pick a color"
                  value={normalizeHex(newHex) ?? '#171717'}
                  onChange={(e) => setNewHex(e.target.value)}
                  className="h-11 w-16 cursor-pointer rounded border border-ink/20 bg-white p-1"
                />
              </Field>
              <Field label="Hex code">
                <Input value={newHex} onChange={(e) => setNewHex(e.target.value)} placeholder="#596044" className="max-w-[8rem]" />
              </Field>
              <span className="mb-2 size-11 rounded-full border border-black/10" style={{ background: normalizeHex(newHex) ?? '#171717' }} />
            </div>
            <Button type="button" disabled={busy || !newName.trim()} onClick={() => void addColor()}>{busy ? 'Saving…' : 'Save color'}</Button>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.colors.map((color) => (
          <div key={color.id} className={`rounded-lg border bg-white p-3 ${!paletteOnly && selected(color) ? 'border-clay' : 'border-ink/10'}`}>
            {!paletteOnly ? (
              <button type="button" onClick={() => toggleProductColor(color, !selected(color))} className="flex w-full items-center gap-3 text-left">
                <span className="size-9 shrink-0 rounded-full border border-black/10" style={{ background: color.hex }} />
                <span>
                  <span className="block text-sm font-bold">{color.name}</span>
                  <span className="text-xs text-ink/45">{color.hex} · {selected(color) ? 'Selected' : 'Click to select'}</span>
                  {color.description && <span className="mt-1 block text-xs text-ink/55">{color.description}</span>}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="size-9 shrink-0 rounded-full border border-black/10" style={{ background: color.hex }} />
                <span>
                  <span className="block text-sm font-bold">{color.name}</span>
                  <span className="text-xs text-ink/45">{color.hex}</span>
                  {color.description && <span className="mt-1 block text-xs text-ink/55">{color.description}</span>}
                </span>
              </div>
            )}
            {!assignOnly && editId === color.id ? (
              <div className="mt-3 grid gap-2 border-t border-ink/10 pt-3">
                <Field label="Name"><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></Field>
                <Field label="Description"><Textarea rows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></Field>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Color">
                    <input
                      type="color"
                      aria-label="Edit color"
                      value={normalizeHex(editHex) ?? '#000000'}
                      onChange={(e) => setEditHex(e.target.value)}
                      className="h-11 w-16 cursor-pointer rounded border border-ink/20 bg-white p-1"
                    />
                  </Field>
                  <Field label="Hex code"><Input value={editHex} onChange={(e) => setEditHex(e.target.value)} className="max-w-[8rem]" /></Field>
                </div>
                <div className="flex gap-2">
                  <Button type="button" disabled={busy} onClick={() => void saveEdit(color.id)}>{busy ? 'Saving…' : 'Save changes'}</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                </div>
              </div>
            ) : !assignOnly ? (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditId(color.id)
                    setEditName(color.name)
                    setEditHex(color.hex)
                    setEditDescription(color.description ?? '')
                    setError('')
                  }}
                >
                  Edit
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => void removeColor(color.id)}>Delete</Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {!data.colors.length && <p className="text-sm text-ink/50">No colors yet. Add one above, then select it on a product.</p>}
    </div>
  )
}
