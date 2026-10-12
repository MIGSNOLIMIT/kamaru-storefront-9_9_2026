import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductGrid } from '../components/Product'
import { Breadcrumbs, Button } from '../components/UI'
import { useCatalogStats, useCategories, useColors, useProducts } from '../hooks/useContent'
import type { ProductMaterial } from '../types'

const MATERIAL_LABELS: Record<ProductMaterial, string> = {
  polyester: 'Polyester',
  'nylon-420-hd': 'Nylon 420 HD',
  kipling: 'Kipling',
}

const PAGE_SIZE = 12

function highlightName(name: string, term?: string) {
  if (!term?.trim()) return name
  const i = name.toLowerCase().indexOf(term.toLowerCase())
  if (i < 0) return name
  return (
    <>
      {name.slice(0, i)}
      <mark className="bg-khaki/40">{name.slice(i, i + term.length)}</mark>
      {name.slice(i + term.length)}
    </>
  )
}

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)

  const categorySlug = params.get('category') ?? undefined
  const query = useMemo(
    () => ({
      category: categorySlug,
      search: params.get('search') ?? undefined,
      color: params.get('color') ?? undefined,
      material: (params.get('material') as ProductMaterial | null) ?? undefined,
      maxPrice: params.get('max') ? Number(params.get('max')) : undefined,
      sort: (params.get('sort') ?? 'featured') as 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name',
      limit: PAGE_SIZE * page,
      offset: 0,
    }),
    [params, categorySlug, page],
  )

  const { data, loading, error } = useProducts(query)
  const { data: categories } = useCategories()
  const { data: palette } = useColors()
  const { data: stats } = useCatalogStats()

  const current = categories.find((c) => c.slug === categorySlug)
  const roots = categories.filter((c) => !c.parentId)
  const minP = Math.floor(stats.minPrice / 50) * 50 || 0
  const maxP = Math.ceil(stats.maxPrice / 50) * 50 || 3500
  const maxVal = params.get('max') ? Number(params.get('max')) : maxP

  const update = (key: string, value?: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setPage(1)
    setParams(next)
  }

  const clearAll = () => {
    setPage(1)
    setParams(new URLSearchParams())
  }

  const chips: { key: string; label: string }[] = []
  if (query.search) chips.push({ key: 'search', label: `Search: ${query.search}` })
  if (categorySlug && current) chips.push({ key: 'category', label: current.name })
  if (query.color) {
    const c = palette.find((x) => x.id === query.color)
    chips.push({ key: 'color', label: c?.name ?? query.color })
  }
  if (query.material) chips.push({ key: 'material', label: MATERIAL_LABELS[query.material] ?? query.material })
  if (params.get('max')) chips.push({ key: 'max', label: `Up to ₱${params.get('max')}` })

  const filters = (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold tracking-wider">CATEGORIES</h2>
        <button type="button" className="lg:hidden" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
          <X />
        </button>
      </div>
      <ul className="mt-5 space-y-3 text-sm">
        <li>
          <Link className={!categorySlug ? 'font-bold text-clay' : ''} to="/shop" onClick={() => setFiltersOpen(false)}>
            All Products
          </Link>
        </li>
        {roots.map((root) => (
          <li key={root.id}>
            <Link
              className={categorySlug === root.slug ? 'font-bold text-clay' : ''}
              to={`/shop?category=${encodeURIComponent(root.slug)}`}
              onClick={() => setFiltersOpen(false)}
            >
              {root.name}
            </Link>
            {categorySlug === root.slug && (
              <ul className="ml-3 mt-2 space-y-2 border-l border-ink/15 pl-3 text-xs text-ink/60">
                {categories.filter((c) => c.parentId === root.id).map((c) => (
                  <li key={c.id}>
                    <Link to={`/shop?category=${encodeURIComponent(c.slug)}`} onClick={() => setFiltersOpen(false)}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-9 border-t border-ink/15 pt-6">
        <h2 className="text-sm font-extrabold tracking-wider">PRICE</h2>
        <label className="mt-4 block text-xs text-ink/60" htmlFor="max-price">
          Up to {maxVal >= maxP ? 'any price' : `₱${maxVal}`}
        </label>
        <input
          id="max-price"
          type="range"
          min={minP}
          max={maxP}
          step="50"
          value={maxVal}
          onChange={(e) => update('max', e.target.value === String(maxP) ? undefined : e.target.value)}
          className="mt-3 w-full accent-clay"
        />
      </div>
      {stats.materials.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-extrabold tracking-wider">MATERIAL</h2>
          {stats.materials.map((mat) => (
            <button
              key={mat}
              type="button"
              onClick={() => update('material', query.material === mat ? undefined : mat)}
              className={`mr-2 mb-2 border px-3 py-2 text-xs ${query.material === mat ? 'border-clay bg-clay text-white' : 'border-ink/20'}`}
            >
              {MATERIAL_LABELS[mat] ?? mat}
            </button>
          ))}
        </div>
      )}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-extrabold tracking-wider">COLOR</h2>
        {palette.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => update('color', query.color === color.id ? undefined : color.id)}
            className={`mr-2 mb-2 inline-flex items-center gap-2 border px-3 py-2 text-xs ${query.color === color.id ? 'border-clay bg-clay text-white' : 'border-ink/20'}`}
          >
            <span className="size-3 rounded-full border border-black/10" style={{ background: color.hex }} aria-hidden />
            {color.name}
          </button>
        ))}
      </div>
      <Button variant="outline" className="mt-8 w-full" onClick={clearAll}>
        Clear filters
      </Button>
    </div>
  )

  const hasMore = data.items.length < data.total

  return (
    <div className="container-site section-space">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: current?.name ?? 'Shop' }]} />
      <div className="mt-6 flex flex-col justify-between gap-4 border-b border-ink/15 pb-7 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold tracking-[.18em] text-clay">KAMARU CATALOG</p>
          <h1 className="mt-2 text-4xl font-extrabold md:text-6xl">{current?.name.toUpperCase() ?? 'SHOP ALL BAGS'}</h1>
          <p className="mt-2 text-sm text-ink/55">
            {query.search ? `Results for “${query.search}”` : current?.description}
          </p>
          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => update(chip.key, undefined)}
                  className="inline-flex items-center gap-1 border border-ink/20 px-2 py-1 text-[10px] font-bold tracking-wider"
                >
                  {chip.label} <X size={12} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex min-h-11 items-center gap-2 border border-ink/20 px-4 text-xs font-bold lg:hidden"
          >
            <SlidersHorizontal size={16} /> FILTERS
          </button>
          <label htmlFor="sort" className="sr-only">
            Sort products
          </label>
          <select
            id="sort"
            value={query.sort}
            onChange={(e) => update('sort', e.target.value)}
            className="min-h-11 border border-ink/20 bg-transparent px-4 text-xs font-bold"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      <div className="mt-8 grid gap-9 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        <div>
          <p className="mb-5 text-xs text-ink/55">
            Showing {data.items.length} of {data.total} result{data.total !== 1 ? 's' : ''}
          </p>
          {error && (
            <p className="mb-5 border border-clay/30 bg-clay/5 p-4 text-sm text-clay">
              Could not load products. {error.message}
            </p>
          )}
          {loading && !data.items.length ? (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/5] animate-pulse bg-ink/10" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <ProductGrid
                  products={data.items}
                  renderName={(p) => highlightName(p.name, query.search)}
                />
              </div>
              {hasMore && (
                <div className="mt-10 text-center">
                  <Button variant="outline" disabled={loading} onClick={() => setPage((p) => p + 1)}>
                    {loading ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {filtersOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50" onClick={() => setFiltersOpen(false)}>
          <aside onClick={(e) => e.stopPropagation()} className="h-full w-[86%] max-w-sm overflow-auto bg-bone p-6">
            {filters}
          </aside>
        </div>
      )}
    </div>
  )
}
