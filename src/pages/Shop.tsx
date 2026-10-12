import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ProductGrid } from '../components/Product'
import { Breadcrumbs, Button } from '../components/UI'
import { useCategories, useColors, useProducts } from '../hooks/useContent'

export default function Shop() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const query = useMemo(() => ({
    category: slug ?? params.get('category') ?? undefined,
    search: params.get('search') ?? undefined,
    color: params.get('color') ?? undefined,
    maxPrice: params.get('max') ? Number(params.get('max')) : undefined,
    sort: (params.get('sort') ?? 'featured') as 'featured'|'newest'|'price-asc'|'price-desc'|'name',
  }), [slug, params])
  const { data, loading } = useProducts(query)
  const { data: categories } = useCategories()
  const { data: palette } = useColors()
  const current = categories.find((c) => c.slug === slug)
  const roots = categories.filter((c) => !c.parentId)
  const update = (key:string,value?:string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }
  const filters = <div><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold tracking-wider">CATEGORIES</h2><button className="lg:hidden" onClick={()=>setFiltersOpen(false)} aria-label="Close filters"><X/></button></div><ul className="mt-5 space-y-3 text-sm"><li><Link className={!query.category?'font-bold text-clay':''} to="/shop">All Products</Link></li>{roots.map((root)=><li key={root.id}><Link className={query.category===root.slug?'font-bold text-clay':''} to={`/category/${root.slug}`}>{root.name}</Link>{query.category===root.slug&&<ul className="ml-3 mt-2 space-y-2 border-l border-ink/15 pl-3 text-xs text-ink/60">{categories.filter(c=>c.parentId===root.id).map(c=><li key={c.id}><Link to={`/category/${c.slug}`}>{c.name}</Link></li>)}</ul>}</li>)}</ul><div className="mt-9 border-t border-ink/15 pt-6"><h2 className="text-sm font-extrabold tracking-wider">PRICE</h2><label className="mt-4 block text-xs text-ink/60" htmlFor="max-price">Up to {params.get('max') ? `₱${params.get('max')}` : 'any price'}</label><input id="max-price" type="range" min="600" max="3500" step="100" value={params.get('max')??3500} onChange={(e)=>update('max',e.target.value==='3500'?undefined:e.target.value)} className="mt-3 w-full accent-clay"/></div><div className="mt-8"><h2 className="mb-4 text-sm font-extrabold tracking-wider">COLOR</h2>{palette.map((color)=><button key={color.id} type="button" onClick={()=>update('color',query.color===color.id?undefined:color.id)} className={`mr-2 mb-2 inline-flex items-center gap-2 border px-3 py-2 text-xs ${query.color===color.id?'border-clay bg-clay text-white':'border-ink/20'}`}><span className="size-3 rounded-full border border-black/10" style={{ background: color.hex }} aria-hidden />{color.name}</button>)}</div><Button variant="outline" className="mt-8 w-full" onClick={()=>setParams(new URLSearchParams())}>Clear filters</Button></div>
  return <div className="container-site section-space"><Breadcrumbs items={[{label:'Home',to:'/'},{label:current?.name??'Shop'}]}/><div className="mt-6 flex flex-col justify-between gap-4 border-b border-ink/15 pb-7 md:flex-row md:items-end"><div><p className="text-xs font-bold tracking-[.18em] text-clay">KAMARU CATALOG</p><h1 className="mt-2 text-4xl font-extrabold md:text-6xl">{current?.name.toUpperCase()??'SHOP ALL BAGS'}</h1><p className="mt-2 text-sm text-ink/55">{query.search ? `Results for “${query.search}”` : current?.description}</p></div><div className="flex items-center gap-3"><button onClick={()=>setFiltersOpen(true)} className="flex min-h-11 items-center gap-2 border border-ink/20 px-4 text-xs font-bold lg:hidden"><SlidersHorizontal size={16}/> FILTERS</button><label htmlFor="sort" className="sr-only">Sort products</label><select id="sort" value={query.sort} onChange={e=>update('sort',e.target.value)} className="min-h-11 border border-ink/20 bg-transparent px-4 text-xs font-bold"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></div></div><div className="mt-8 grid gap-9 lg:grid-cols-[240px_1fr]"><aside className="hidden lg:block">{filters}</aside><div><p className="mb-5 text-xs text-ink/55">Showing {data.total} result{data.total!==1?'s':''}</p>{loading?<div className="grid grid-cols-2 gap-5 lg:grid-cols-3">{[1,2,3,4,5,6].map(i=><div key={i} className="aspect-[4/5] animate-pulse bg-ink/10"/>)}</div>:<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"><ProductGrid products={data.items}/></div>}</div></div>{filtersOpen&&<div className="fixed inset-0 z-[80] bg-black/50" onClick={()=>setFiltersOpen(false)}><aside onClick={e=>e.stopPropagation()} className="h-full w-[86%] max-w-sm overflow-auto bg-bone p-6">{filters}</aside></div>}</div>
}
