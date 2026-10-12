import { useEffect, useState } from 'react'
import type { HomeSection, Product, SectionContent, SectionContentItem } from '../../../src/types'
import { api, type Snapshot } from '../api'
import { ImageField } from '../components/ImageField'
import { Button, Card, Field, Input, Notice, PageHeader, Select, Textarea } from '../ui'

const allTypes: HomeSection['type'][] = ['hero', 'benefits', 'categories', 'new-arrivals', 'editorial', 'water-resistant', 'story', 'best-sellers', 'lifestyle', 'journal', 'newsletter']

const defaultBenefitItems: SectionContentItem[] = [
  { title: 'WATER RESISTANT', text: 'Built to handle everyday adventures.' },
  { title: 'DURABLE MATERIALS', text: 'Made for long-lasting use.' },
  { title: 'FILIPINO BRAND', text: 'Proudly serving Filipino customers.' },
  { title: 'DESIGNED FOR COMFORT', text: 'Carry your load with ease.' },
]

function ProductPicker({
  productIds,
  products,
  onChange,
}: {
  productIds: string[]
  products: Product[]
  onChange: (ids: string[]) => void
}) {
  const [pickId, setPickId] = useState('')
  const published = products.filter((p) => p.status === 'published' && !p.flags.discontinued)
  const available = published.filter((p) => !productIds.includes(p.id))
  const add = () => {
    if (!pickId || productIds.includes(pickId)) return
    onChange([...productIds, pickId])
    setPickId('')
  }
  const move = (index: number, dir: -1 | 1) => {
    const swap = index + dir
    if (swap < 0 || swap >= productIds.length) return
    const next = [...productIds]
    ;[next[index], next[swap]] = [next[swap], next[index]]
    onChange(next)
  }
  const nameFor = (id: string) => products.find((p) => p.id === id)?.name ?? id

  return (
    <div className="md:col-span-2 space-y-3">
      <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">FEATURED PRODUCTS</p>
      <p className="text-xs text-ink/45">Pick any number of published products. Leave empty to use automatic flag-based products on the storefront.</p>
      <div className="flex flex-wrap gap-2">
        <Select value={pickId} onChange={(e) => setPickId(e.target.value)} className="max-w-md flex-1">
          <option value="">Select a product…</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <Button type="button" variant="outline" disabled={!pickId} onClick={add}>Add</Button>
      </div>
      {productIds.length > 0 && (
        <ul className="space-y-2">
          {productIds.map((id, index) => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 border border-ink/10 px-3 py-2 text-sm">
              <span className="font-bold">{nameFor(id)}</span>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)}>Up</Button>
                <Button type="button" variant="ghost" disabled={index === productIds.length - 1} onClick={() => move(index, 1)}>Down</Button>
                <Button type="button" variant="ghost" onClick={() => onChange(productIds.filter((x) => x !== id))}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SectionContentEditor({
  section,
  products,
  onChange,
}: {
  section: HomeSection
  products: Product[]
  onChange: (content: SectionContent) => void
}) {
  const c = section.content ?? {}
  const set = (patch: Partial<SectionContent>) => onChange({ ...c, ...patch })
  const items = c.items?.length ? c.items : defaultBenefitItems
  const setItem = (index: number, patch: Partial<SectionContentItem>) => {
    const next = [...items]
    next[index] = { ...next[index], ...patch }
    set({ items: next })
  }

  return (
    <div className="mt-4 grid gap-4 border-t border-ink/10 pt-4 md:grid-cols-2">
      <Field label="Eyebrow / kicker (small label)">
        <Input value={c.subheadline ?? ''} onChange={(e) => set({ subheadline: e.target.value || undefined })} placeholder="e.g. KAMARU OUTDOOR" />
      </Field>
      <Field label="Headline">
        <Input value={c.headline ?? ''} onChange={(e) => set({ headline: e.target.value || undefined })} placeholder="Main title (use line breaks in body for multi-line heroes)" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Body / subtitle">
          <Textarea rows={4} value={c.body ?? ''} onChange={(e) => set({ body: e.target.value || undefined })} placeholder="Supporting text. For water-resistant, one line per badge label." />
        </Field>
      </div>
      <div className="md:col-span-2">
        <ImageField
          label="Section image"
          image={c.image ?? { id: `${section.type}-image`, alt: section.type, width: 1600, height: 900 }}
          onChange={(image) => set({ image })}
        />
      </div>
      <Field label="Button label">
        <Input value={c.ctaLabel ?? ''} onChange={(e) => set({ ctaLabel: e.target.value || undefined })} />
      </Field>
      <Field label="Button link">
        <Input value={c.ctaHref ?? ''} onChange={(e) => set({ ctaHref: e.target.value || undefined })} placeholder="/shop or /about" />
      </Field>
      {section.type === 'benefits' && (
        <div className="md:col-span-2 space-y-3">
          <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">BENEFIT TILES (4)</p>
          {items.slice(0, 4).map((item, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-2">
              <Input value={item.title ?? ''} onChange={(e) => setItem(index, { title: e.target.value })} placeholder="Title" />
              <Input value={item.text ?? ''} onChange={(e) => setItem(index, { text: e.target.value })} placeholder="Description" />
            </div>
          ))}
        </div>
      )}
      {(section.type === 'new-arrivals' || section.type === 'best-sellers') && (
        <ProductPicker
          productIds={c.productIds ?? []}
          products={products}
          onChange={(productIds) => set({ productIds: productIds.length ? productIds : undefined })}
        />
      )}
      <p className="md:col-span-2 text-xs text-ink/45">
        Category tiles and journal cards still come from Categories and Journal. Empty text fields use the current storefront defaults.
      </p>
    </div>
  )
}

export function Sections() {
  const [sections, setSections] = useState<HomeSection[]>([])
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    void api.snapshot().then((data: Snapshot) => {
      setCatalogProducts(data.products)
      setSections([...data.homeSections].sort((a, b) => a.sortOrder - b.sortOrder))
    }).catch((e: Error) => setError(e.message))
  }, [])

  const persist = async (next: HomeSection[]) => {
    const ordered = next.map((section, sortOrder) => ({ ...section, sortOrder }))
    setSections(ordered as HomeSection[])
    try {
      await api.saveSections(ordered as HomeSection[])
      setSaved('Homepage saved. Refresh the storefront to see changes.')
      setError('')
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

  const updateContent = (index: number, content: SectionContent) => {
    const next = sections.map((s, i) => (i === index ? { ...s, content } : s)) as HomeSection[]
    setSections(next)
  }

  const saveSectionContent = () => {
    void persist(sections)
    setEditingId(null)
  }

  const unused = allTypes.filter((type) => !sections.some((section) => section.type === type))

  return (
    <div>
      <PageHeader kicker="Storefront" title="Homepage sections" />
      <p className="mb-6 max-w-2xl text-sm text-ink/60">
        Reorder blocks, edit headlines and images, or remove a block to hide it. Add blocks back from the unused list below.
      </p>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {saved && <p className="mb-5 text-sm text-olive">{saved}</p>}
      <Card className="space-y-3">
        {sections.map((section, index) => (
          <div key={section.id} className="border-b border-ink/10 py-3 last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-bold capitalize">{section.type.replaceAll('-', ' ')}</p>
                <p className="text-xs text-ink/40">id: {section.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={index === 0} onClick={() => move(index, -1)}>Up</Button>
                <Button type="button" variant="outline" disabled={index === sections.length - 1} onClick={() => move(index, 1)}>Down</Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(editingId === section.id ? null : section.id)}>
                  {editingId === section.id ? 'Close' : 'Edit content'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => void persist(sections.filter((s) => s.id !== section.id))}>Remove</Button>
              </div>
            </div>
            {editingId === section.id && (
              <>
                <SectionContentEditor section={section} products={catalogProducts} onChange={(content) => updateContent(index, content)} />
                <Button type="button" className="mt-4" onClick={() => saveSectionContent()}>Save section content</Button>
              </>
            )}
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
