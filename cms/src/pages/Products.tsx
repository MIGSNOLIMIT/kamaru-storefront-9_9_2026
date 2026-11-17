import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Product, ProductMaterial } from '../../../src/types'

const MATERIALS: { id: ProductMaterial; label: string }[] = [
  { id: 'polyester', label: 'Polyester' },
  { id: 'nylon-420-hd', label: 'Nylon 420 HD' },
  { id: 'kipling', label: 'Kipling' },
]
import { api, formatPrice, slugify, type Snapshot } from '../api'
import { ColorPaletteEditor } from '../components/ColorPaletteEditor'
import { ImageField } from '../components/ImageField'
import { useConfirm } from '../confirm'
import { Button, Card, Field, Input, Notice, PageHeader, Select, Textarea } from '../ui'
import { isMoney, isSlug } from '../validate'

export function ProductList() {
  const confirm = useConfirm()
  const [data, setData] = useState<Snapshot | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  useEffect(() => { void api.snapshot().then(setData).catch((e: Error) => setError(e.message)) }, [])
  const items = useMemo(() => {
    const term = search.toLowerCase()
    return (data?.products ?? []).filter((p) => !term || p.name.toLowerCase().includes(term) || p.slug.includes(term))
  }, [data, search])
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const publishSelected = async () => {
    if (!data || !selected.length) return
    const ok = await confirm({ title: 'Publish products?', message: `Publish ${selected.length} selected product${selected.length === 1 ? '' : 's'}.`, confirmLabel: 'Publish' })
    if (!ok) return
    for (const id of selected) {
      const p = data.products.find((x) => x.id === id)
      if (p) await api.saveProduct({ ...p, status: 'published' }, false)
    }
    setData(await api.snapshot())
    setSelected([])
  }
  const deleteOne = async (product: Product) => {
    const ok = await confirm({ title: 'Delete product?', message: `Delete “${product.name}”. This cannot be undone.`, confirmLabel: 'Delete', tone: 'danger' })
    if (!ok) return
    setError('')
    try {
      await api.deleteProduct(product.id)
      setData(await api.snapshot())
      setSelected((s) => s.filter((id) => id !== product.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }
  const deleteSelected = async () => {
    if (!selected.length) return
    const ok = await confirm({ title: 'Delete products?', message: `Delete ${selected.length} product${selected.length === 1 ? '' : 's'}. This cannot be undone.`, confirmLabel: 'Delete', tone: 'danger' })
    if (!ok) return
    setError('')
    const failures: string[] = []
    for (const id of selected) {
      try {
        await api.deleteProduct(id)
      } catch (e) {
        failures.push(e instanceof Error ? e.message : id)
      }
    }
    setData(await api.snapshot())
    setSelected([])
    if (failures.length) setError(failures.join(' · '))
  }
  const exportCsv = () => {
    const rows = [['id', 'name', 'slug', 'price', 'status']]
    items.forEach((p) => rows.push([p.id, p.name, p.slug, String(p.price), p.status]))
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kamaru-products.csv'
    a.click()
  }
  if (!data) return <p className="text-sm text-ink/50">{error || 'Loading products…'}</p>
  return (
    <div>
      <PageHeader kicker="Catalog" title="Products">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!selected.length} onClick={() => void publishSelected()}>Publish selected</Button>
          <Button type="button" variant="outline" disabled={!selected.length} onClick={() => void deleteSelected()}>Delete selected</Button>
          <Button type="button" variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Link to="/products/new"><Button>New product</Button></Link>
        </div>
      </PageHeader>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="mb-5 max-w-sm" />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-[10px] tracking-[.14em] text-ink/40"><tr><th className="pb-3 w-8" /><th className="pb-3">NAME</th><th className="pb-3">PRICE</th><th className="pb-3">STATUS</th><th className="pb-3">STOCK</th><th className="pb-3">QUALITY</th><th className="pb-3" /></tr></thead>
          <tbody>
            {items.map((product) => (
              <tr key={product.id} className="border-t border-ink/10">
                <td className="py-3"><input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggle(product.id)} aria-label={`Select ${product.name}`} /></td>
                <td className="py-3 font-bold"><Link className="hover:text-clay" to={`/products/${product.id}`}>{product.name}</Link></td>
                <td>{formatPrice(product.price)}</td>
                <td className="uppercase">{product.status}</td>
                <td>{product.inStock ? 'In stock' : 'Sold out'}</td>
                <td className="text-ink/50">{product.dataQuality}</td>
                <td className="py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        const copy = {
                          ...product,
                          id: `${product.id}-copy`,
                          slug: `${product.slug}-copy`,
                          name: `${product.name} (copy)`,
                          status: 'draft' as const,
                        }
                        await api.saveProduct(copy, true)
                        setData(await api.snapshot())
                      }}
                    >
                      Duplicate
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => void deleteOne(product)}>Delete</Button>
                  </div>
                </td>
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
  images: [{ id: 'image-0', alt: '', width: 900, height: 1100 }],
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
  const confirm = useConfirm()
  const isNew = !id
  const [data, setData] = useState<Snapshot | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    setData(null)
    setProduct(null)
    setError('')
    void api.snapshot().then((snapshot) => {
      setData(snapshot)
      setProduct(isNew ? blank(snapshot.products.length) : snapshot.products.find((p) => p.id === id) ?? null)
    }).catch((e: Error) => setError(e.message))
  }, [id, isNew])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  if (!data) return error ? <Notice>{error}</Notice> : <p className="text-sm text-ink/50">Loading…</p>
  if (!isNew && !product) return <p className="text-sm text-ink/50">Product not found.</p>
  if (!product) return <p className="text-sm text-ink/50">Loading…</p>

  const set = <K extends keyof Product>(key: K, value: Product[K]) => {
    setDirty(true)
    setProduct({ ...product, [key]: value })
  }
  const slug = product.slug.trim() || slugify(product.name)
  const nameError = product.name.trim() ? '' : 'Product name is required.'
  const slugError = isSlug(slug) ? '' : 'Use lowercase letters, numbers, and hyphens.'
  const priceError = isMoney(product.price) ? '' : 'Price must be zero or greater.'
  const save = async (closeAfter: boolean) => {
    if (nameError || slugError || priceError) {
      setError(nameError || slugError || priceError)
      return
    }
    const ok = await confirm({
      title: closeAfter ? 'Save and close?' : 'Save product?',
      message: `Save “${product.name.trim()}” to the catalog.`,
      confirmLabel: closeAfter ? 'Save and close' : 'Save',
    })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      const next = { ...product, slug, id: product.id || `product-${slug}` }
      await api.saveProduct(next, isNew)
      setDirty(false)
      setSavedMsg('Saved.')
      if (closeAfter) navigate('/products')
      else if (isNew) navigate(`/products/${next.id}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (isNew) return
    const ok = await confirm({
      title: 'Delete product?',
      message: `Delete “${product.name}”. This removes it from the catalog.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.deleteProduct(product.id)
      navigate('/products')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader kicker="Catalog" title={isNew ? 'New product' : product.name}>
        <div className="flex flex-wrap gap-2">
          {!isNew && product.status === 'published' && (
            <a href={`/product/${product.slug}`} target="_blank" rel="noreferrer"><Button type="button" variant="outline">View on storefront</Button></a>
          )}
          {!isNew && product.status === 'draft' && <span className="self-center text-xs text-ink/50">Draft — not on the shop</span>}
          {!isNew && <Button type="button" variant="ghost" onClick={() => void remove()}>Delete</Button>}
          <Link to="/products"><Button type="button" variant="outline">Back</Button></Link>
          <Button type="button" disabled={busy || !product.name.trim()} onClick={() => void save(false)}>{busy ? 'Saving…' : 'Save'}</Button>
          <Button type="button" disabled={busy || !product.name.trim()} onClick={() => void save(true)}>{busy ? 'Saving…' : 'Save and close'}</Button>
        </div>
      </PageHeader>
      {savedMsg && <p className="mb-4 text-sm text-olive">{savedMsg}</p>}
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="space-y-5">
          <Field label="Name" error={error ? nameError : ''}><Input value={product.name} onChange={(e) => {
            const name = e.target.value
            setDirty(true)
            setProduct({ ...product, name, slug: isNew ? slugify(name) : product.slug })
          }} /></Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Slug" error={error ? slugError : ''}><Input value={product.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
            <Field label="SKU"><Input value={product.sku ?? ''} onChange={(e) => set('sku', e.target.value || undefined)} /></Field>
            <Field label="Price (PHP)" error={error ? priceError : ''}><Input type="number" min={0} step="0.5" value={product.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
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
            <div className="mt-3">
              <ColorPaletteEditor
                assignOnly
                data={data}
                product={product}
                setProduct={(p) => { setDirty(true); setProduct(p) }}
                onPaletteChange={(snapshot, syncProductColors) => {
                  setData(snapshot)
                  if (syncProductColors) {
                    setProduct((prev) =>
                      prev
                        ? {
                            ...prev,
                            colors: prev.colors
                              .map((c) => snapshot.colors.find((x) => x.id === c.id))
                              .filter((c): c is NonNullable<typeof c> => Boolean(c)),
                          }
                        : prev,
                    )
                  }
                }}
              />
            </div>
          </Card>
        </div>
      </div>
      <Card className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">PRODUCT IMAGES</p>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              set('images', [
                ...product.images,
                { id: `image-${Date.now()}`, alt: '', width: 900, height: 1100 },
              ])
            }
          >
            Add image slot
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {product.images.map((image, index) => (
            <div key={image.id} className="space-y-2">
              <ImageField
                label={index === 0 ? 'Main photo' : `Extra photo ${index + 1}`}
                hint={index === 0 ? 'This is the first picture shoppers see. The whole photo fits inside the frame.' : 'Another view of the same product. The whole photo fits inside the frame.'}
                image={image}
                onChange={(next) => set('images', product.images.map((img, i) => (i === index ? next : img)))}
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" disabled={index === 0} onClick={() => {
                  const next = [...product.images]
                  ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                  set('images', next)
                }}>Up</Button>
                <Button type="button" variant="ghost" disabled={index === product.images.length - 1} onClick={() => {
                  const next = [...product.images]
                  ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                  set('images', next)
                }}>Down</Button>
                <Button type="button" variant="ghost" disabled={product.images.length <= 1} onClick={() => set('images', product.images.filter((_, i) => i !== index))}>Remove slot</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
