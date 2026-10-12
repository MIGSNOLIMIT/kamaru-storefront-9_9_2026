import { useRef, useState } from 'react'
import type { ImageRef } from '../../../src/types'
import { api } from '../api'
import { Button, Field, Input } from '../ui'

const ACCEPT = 'image/jpeg,image/png,image/webp'

export function ImageField({
  image,
  onChange,
  label = 'Image',
}: {
  image: ImageRef
  onChange: (next: ImageRef) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const url = await api.uploadImage(file)
      onChange({ ...image, src: url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">{label.toUpperCase()}</p>
      <div className="flex min-h-28 items-center justify-center overflow-hidden border border-ink/15 bg-ink/5">
        {image.src ? (
          <img src={image.src} alt={image.alt || 'Preview'} className="max-h-40 w-full object-contain" />
        ) : (
          <span className="px-4 text-center text-xs text-ink/45">No image yet — upload a file or paste a URL</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Uploading…' : 'Choose file'}
        </Button>
        {image.src && (
          <Button type="button" variant="ghost" onClick={() => onChange({ ...image, src: undefined })}>
            Remove image
          </Button>
        )}
      </div>
      <Field label="Alt text">
        <Input value={image.alt} onChange={(e) => onChange({ ...image, alt: e.target.value })} />
      </Field>
      <Field label="Image URL (optional)">
        <Input
          value={image.src ?? ''}
          placeholder="https://… or /cms/uploads/…"
          onChange={(e) => onChange({ ...image, src: e.target.value.trim() || undefined })}
        />
      </Field>
      {error && <p className="text-xs text-clay">{error}</p>}
      <p className="text-[10px] text-ink/45">JPG, PNG, or WebP up to 5 MB. Files are saved under /cms/uploads/.</p>
    </div>
  )
}
