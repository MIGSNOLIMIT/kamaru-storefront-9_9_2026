import { useEffect, useState } from 'react'
import { api, type Snapshot } from '../api'
import { ColorPaletteEditor } from '../components/ColorPaletteEditor'
import { Notice, PageHeader } from '../ui'
import type { Product } from '../../../src/types'

const dummyProduct = (): Product => ({
  id: '_palette',
  slug: '_palette',
  name: 'Palette',
  price: 0,
  currency: 'PHP',
  categoryIds: [],
  images: [],
  shortDescription: '',
  features: [],
  specs: {},
  colors: [],
  materials: ['polyester'],
  marketplace: {},
  inStock: true,
  flags: { featured: false, newArrival: false, bestSeller: false, discontinued: false },
  dataQuality: 'verified',
  sortOrder: 0,
  status: 'draft',
})

export function ColorsPage() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void api.snapshot().then(setData).catch((e: Error) => setError(e.message))
  }, [])
  if (error) return <Notice>{error}</Notice>
  if (!data) return <p className="text-sm text-ink/50">Loading colors…</p>
  return (
    <div>
      <PageHeader kicker="Catalog" title="Colors" />
      <p className="mb-6 max-w-2xl text-sm text-ink/60">Add the colors the shop sells. They stay on this tab, and you pick them when you create or edit a product.</p>
      <ColorPaletteEditor
        data={data}
        product={dummyProduct()}
        setProduct={() => {}}
        paletteOnly
        onPaletteChange={(snapshot) => setData(snapshot)}
      />
    </div>
  )
}
