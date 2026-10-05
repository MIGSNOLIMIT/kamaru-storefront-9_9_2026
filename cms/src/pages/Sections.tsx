import { useEffect, useState } from 'react'
import type { HomeSection } from '../../../src/types'
import { api } from '../api'
import { Button, Card, Notice, PageHeader } from '../ui'

const allTypes: HomeSection['type'][] = ['hero', 'benefits', 'categories', 'new-arrivals', 'editorial', 'water-resistant', 'story', 'best-sellers', 'lifestyle', 'journal', 'newsletter']

export function Sections() {
  const [sections, setSections] = useState<HomeSection[]>([])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    void api.snapshot().then((data) => setSections([...data.homeSections].sort((a, b) => a.sortOrder - b.sortOrder))).catch((e: Error) => setError(e.message))
  }, [])

  const persist = async (next: HomeSection[]) => {
    const ordered = next.map((section, sortOrder) => ({ ...section, sortOrder }))
    setSections(ordered as HomeSection[])
    try {
      await api.saveSections(ordered as HomeSection[])
      setSaved('Homepage order saved. Refresh the storefront to see it.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...sections]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    void persist(next)
  }

  const unused = allTypes.filter((type) => !sections.some((section) => section.type === type))

  return (
    <div>
      <PageHeader kicker="Storefront" title="Homepage sections" />
      <p className="mb-6 max-w-2xl text-sm text-ink/60">These blocks are what the storefront homepage renders, in this order. Remove a block to hide it, or add it back from the unused list.</p>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {saved && <p className="mb-5 text-sm text-olive">{saved}</p>}
      <Card className="space-y-3">
        {sections.map((section, index) => (
          <div key={section.id} className="flex items-center justify-between gap-4 border-b border-ink/10 py-3 last:border-0">
            <div>
              <p className="font-bold capitalize">{section.type.replaceAll('-', ' ')}</p>
              <p className="text-xs text-ink/40">id: {section.id}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={index === 0} onClick={() => move(index, -1)}>Up</Button>
              <Button type="button" variant="outline" disabled={index === sections.length - 1} onClick={() => move(index, 1)}>Down</Button>
              <Button type="button" variant="ghost" onClick={() => void persist(sections.filter((s) => s.id !== section.id))}>Remove</Button>
            </div>
          </div>
        ))}
      </Card>
      {unused.length > 0 && (
        <Card className="mt-6">
          <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">UNUSED BLOCKS</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {unused.map((type) => (
              <Button key={type} type="button" variant="outline" onClick={() => void persist([...sections, { id: type, type, sortOrder: sections.length } as HomeSection])}>
                Add {type.replaceAll('-', ' ')}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
