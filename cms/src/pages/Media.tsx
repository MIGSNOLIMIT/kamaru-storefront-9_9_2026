import { useEffect, useState } from 'react'
import { api } from '../api'
import { useConfirm } from '../confirm'
import { Button, Card, Notice, PageHeader } from '../ui'

type Asset = { id: string; public_url: string; path: string; created_at: string }

export function MediaPage() {
  const confirm = useConfirm()
  const [items, setItems] = useState<Asset[]>([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => {
    void api.listMedia().then(setItems).catch((e: Error) => setError(e.message))
  }

  useEffect(load, [])

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setMsg('URL copied.')
  }

  const remove = async (id: string) => {
    const ok = await confirm({ title: 'Delete asset?', message: 'Delete this file from the media library. It must not still be used in the catalog.', confirmLabel: 'Delete', tone: 'danger' })
    if (!ok) return
    try {
      await api.deleteMedia(id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader kicker="Assets" title="Media library" />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {msg && <p className="mb-4 text-sm text-olive">{msg}</p>}
      {!items.length ? (
        <p className="text-sm text-ink/50">No uploads yet. Upload images from product or settings fields (Supabase brand-assets).</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((asset) => (
            <Card key={asset.id} className="space-y-3">
              <img src={asset.public_url} alt="" className="max-h-40 w-full object-contain" />
              <p className="truncate text-xs text-ink/50">{asset.path}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void copy(asset.public_url)}>Copy URL</Button>
                <Button type="button" variant="ghost" onClick={() => void remove(asset.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
