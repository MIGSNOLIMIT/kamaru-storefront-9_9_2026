import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { ImageRef } from '../../../src/types'
import { api } from '../api'
import { Button, Field, Input } from '../ui'

const ACCEPT = 'image/jpeg,image/png,image/webp'

export function ImageField({
  image,
  onChange,
  label = 'Image',
  hint = 'The full photo stays visible. A large picture shrinks to the frame, and a small one grows to fit it.',
}: {
  image: ImageRef
  onChange: (next: ImageRef) => void
  label?: string
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const upload = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const url = await api.uploadImage(file)
      onChange({ ...image, src: url, alt: image.alt || file.name.replace(/\.[^.]+$/, '') })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that image')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
      <div className="border-b border-ink/10 px-4 py-3">
        <p className="text-sm font-bold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-ink/50">{hint}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void upload(file)
        }}
        className={`relative block aspect-[4/3] w-full bg-[#f6f3ee] ${dragOver ? 'ring-2 ring-inset ring-clay' : ''}`}
      >
        {image.src ? (
          <img src={image.src} alt={image.alt || 'Selected image'} className="h-full w-full object-contain" />
        ) : (
          <span className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ink/55">
            <span>
              <ImagePlus className="mx-auto mb-2" size={22} />
              {busy ? 'Uploading…' : 'Click or drop a photo here'}
              <span className="mt-1 block text-xs">JPG, PNG, or WebP, up to 5 MB</span>
            </span>
          </span>
        )}
      </button>
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
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {image.src ? 'Replace photo' : 'Choose photo'}
          </Button>
          {image.src && (
            <Button type="button" variant="ghost" onClick={() => onChange({ ...image, src: undefined })}>
              <Trash2 size={14} className="mr-1 inline" /> Remove
            </Button>
          )}
        </div>
        <Field label="Describe the photo" hint="Used if the picture cannot load.">
          <Input value={image.alt} onChange={(e) => onChange({ ...image, alt: e.target.value })} placeholder="Example: Black travel bag, front view" />
        </Field>
        <Field label="Or paste an image link" hint="Leave this alone if you uploaded a file.">
          <Input
            value={image.src ?? ''}
            placeholder="https://… or /cms/uploads/…"
            onChange={(e) => onChange({ ...image, src: e.target.value.trim() || undefined })}
          />
        </Field>
        {error && <p className="text-xs text-clay">{error}</p>}
      </div>
    </div>
  )
}
