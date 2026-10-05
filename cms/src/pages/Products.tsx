import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Product, ProductMaterial } from '../../../src/types'

const MATERIALS: { id: ProductMaterial; label: string }[] = [
  { id: 'polyester', label: 'Polyester' },
  { id: 'nylon-420-hd', label: 'Nylon 420 HD' },
  { id: 'kipling', label: 'Kipling' },
]
import { api, formatPrice, slugify, type Snapshot } from '../api'
import { Button, Card, Field, Input, Notice, PageHeader, Select, Textarea } from '../ui'

export function ProductList() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { void api.snapshot().then(setData).catch((e: Error) => setError(e.message)) }, [])
  const items = useMemo(() => {
    const term = search.toLowerCase()
    return (data?.products ?? []).filter((p) => !term || p.name.toLowerCase().includes(term) || p.slug.includes(term))
  }, [data, search])
  if (!data) return <p className="text-sm text-ink/50">{error || 'Loading products…'}</p>
  return (
    <div>
      <PageHeader kicker="Catalog" title="Products">
        <Link to="/products/new"><Button>New product</Button></Link>
      </PageHeader>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="mb-5 max-w-sm" />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-[10px] tracking-[.14em] text-ink/40"><tr><th className="pb-3">NAME</th><th className="pb-3">PRICE</th><th className="pb-3">STATUS</th><th className="pb-3">STOCK</th><th className="pb-3">QUALITY</th></tr></thead>
          <tbody>
            {items.map((product) => (
              <tr key={product.id} className="border-t border-ink/10">
                <td className="py-3 font-bold"><Link className="hover:text-clay" to={`/products/${product.id}`}>{product.name}</Link></td>
                <td>{formatPrice(product.price)}</td>
                <td className="uppercase">{product.status}</td>
                <td>{product.inStock ? 'In stock' : 'Sold out'}</td>
                <td className="text-ink/50">{product.dataQuality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

const blank = (sortOrder: number): Product => ({
  id: '',
  slug: '',
  name: '',
  price: 0,
  currency: 'PHP',
  categoryIds: [],
  images: [0, 1, 2, 3].map((n) => ({ id: `image-${n}`, alt: '', width: 900, height: 1100 })),
  shortDescription: '',
  features: [],
  specs: {},
  colors: [],
  inStock: true,
  materials: ['polyester'],
  marketplace: {},
  flags: { featured: false, newArrival: false, bestSeller: false, discontinued: false },
  dataQuality: 'placeholder',
  sortOrder,
  status: 'draft',
})

export function ProductEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [data, setData] = useState<Snapshot | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void api.snapshot().then((snapshot) => {
      setData(snapshot)
      setProduct(isNew ? blank(snapshot.products.length) : snapshot.products.find((p) => p.id === id) ?? null)
    }).catch((e: Error) => setError(e.message))
  }, [id, isNew])

  if (error) return <Notice>{error}</Notice>
  if (!data || !product) return <p className="text-sm text-ink/50">{isNew ? 'Loading…' : 'Product not found.'}</p>

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setProduct({ ...product, [key]: value })
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const slug = product.slug || slugify(product.name)
      const next = { ...product, slug, id: product.id || `product-${slug}` }
      await api.saveProduct(next, isNew)
      navigate('/products')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (isNew || !confirm(`Delete ${product.name}?`)) return
    await api.deleteProduct(product.id)
    navigate('/products')
  }

  return (
    <div>
      <PageHeader kicker="Catalog" title={isNew ? 'New product' : product.name}>
        <div className="flex gap-2">
          {!isNew && <Button type="button" variant="ghost" onClick={() => void remove()}>Delete</Button>}
          <Link to="/products"><Button type="button" variant="outline">Back</Button></Link>
          <Button type="button" disabled={busy || !product.name} onClick={() => void save()}>Save</Button>
        </div>
      </PageHeader>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="space-y-5">
          <Field label="Name"><Input value={product.name} onChange={(e) => {
            const name = e.target.value
            setProduct({ ...product, name, slug: isNew ? slugify(name) : product.slug })
          }} /></Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Slug"><Input value={product.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
            <Field label="SKU"><Input value={product.sku ?? ''} onChange={(e) => set('sku', e.target.value || undefined)} /></Field>
            <Field label="Price (PHP)"><Input type="number" min={0} step="0.5" value={product.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
            <Field label="Sort order"><Input type="number" value={product.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} /></Field>
          </div>
          <Field label="Short description"><Textarea rows={3} value={product.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} /></Field>
          <Field label="Features (one per line)"><Textarea rows={6} value={product.features.join('\n')} onChange={(e) => set('features', e.target.value.split('\n').map((line) => line.trim()).filter(Boolean))} /></Field>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Dimensions"><Input value={product.specs.dimensions ?? ''} onChange={(e) => set('specs', { ...product.specs, dimensions: e.target.value || undefined })} /></Field>
            <Field label="Load capacity"><Input value={product.specs.loadCapacity ?? ''} onChange={(e) => set('specs', { ...product.specs, loadCapacity: e.target.value || undefined })} /></Field>
            <Field label="Weight"><Input value={product.specs.weight ?? ''} onChange={(e) => set('specs', { ...product.specs, weight: e.target.value || undefined })} /></Field>
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="space-y-4">
            <Field label="Status">
              <Select value={product.status} onChange={(e) => set('status', e.target.value as Product['status'])}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </Select>
            </Field>
            <Field label="Data quality">
              <Select value={product.dataQuality} onChange={(e) => set('dataQuality', e.target.value as Product['dataQuality'])}>
                <option value="verified">Verified</option>
                <option value="placeholder">Placeholder</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={product.inStock} onChange={(e) => set('inStock', e.target.checked)} /> In stock</label>
            {(['featured', 'newArrival', 'bestSeller', 'discontinued'] as const).map((flag) => (
              <label key={flag} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={product.flags[flag]} onChange={(e) => set('flags', { ...product.flags, [flag]: e.target.checked })} /> {flag.replace(/[A-Z]/g, (c) => ` ${c}`)}</label>
            ))}
          </Card>
          <Card className="space-y-4">
            <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">MATERIALS</p>
            {MATERIALS.map((mat) => (
              <label key={mat.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={product.materials.includes(mat.id)} onChange={(e) => set('materials', e.target.checked ? [...product.materials, mat.id] : product.materials.filter((m) => m !== mat.id))} />
                {mat.label}
              </label>
            ))}
          </Card>
          <Card className="space-y-4">
            <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">MARKETPLACE LINKS</p>
            <Field label="Shopee URL"><Input value={product.marketplace.shopee ?? ''} onChange={(e) => set('marketplace', { ...product.marketplace, shopee: e.target.value || undefined })} /></Field>
            <Field label="Lazada URL"><Input value={product.marketplace.lazada ?? ''} onChange={(e) => set('marketplace', { ...product.marketplace, lazada: e.target.value || undefined })} /></Field>
            <Field label="TikTok URL"><Input value={product.marketplace.tiktok ?? ''} onChange={(e) => set('marketplace', { ...product.marketplace, tiktok: e.target.value || undefined })} /></Field>
          </Card>
          <Card>
            <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">CATEGORIES</p>
            <div className="mt-3 max-h-56 space-y-2 overflow-auto">
              {data.categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={product.categoryIds.includes(category.id)} onChange={(e) => set('categoryIds', e.target.checked ? [...product.categoryIds, category.id] : product.categoryIds.filter((cid) => cid !== category.id))} />
                  {category.parentId ? `${data.categories.find((c) => c.id === category.parentId)?.name} / ${category.name}` : category.name}
                </label>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">COLORS</p>
            <div className="mt-3 space-y-2">
              {data.colors.map((color) => (
                <label key={color.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={product.colors.some((c) => c.id === color.id)} onChange={(e) => set('colors', e.target.checked ? [...product.colors, color] : product.colors.filter((c) => c.id !== color.id))} />
                  <span className="size-4 rounded-full border border-black/10" style={{ background: color.hex }} />
                  {color.name}
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <Card className="mt-6 grid gap-4 md:grid-cols-2">
        {product.images.map((image, index) => (
          <div key={image.id} className="grid gap-3">
            <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">IMAGE {index + 1}</p>
            <Field label="Alt text"><Input value={image.alt} onChange={(e) => set('images', product.images.map((img, i) => i === index ? { ...img, alt: e.target.value } : img))} /></Field>
            <Field label="Image URL (optional)"><Input value={image.src ?? ''} onChange={(e) => set('images', product.images.map((img, i) => i === index ? { ...img, src: e.target.value || undefined } : img))} /></Field>
          </div>
        ))}
      </Card>
    </div>
  )
}
