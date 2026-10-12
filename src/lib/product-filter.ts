import type { Category, Product, ProductQuery } from '../types.ts'

export function filterProducts(items: Product[], query: ProductQuery, cats: Category[]) {
  let next = items.filter((product) => product.status === 'published' && !product.flags.discontinued)
  if (query.search) {
    const term = query.search.toLowerCase()
    next = next.filter((p) =>
      [p.name, p.shortDescription, ...p.features].some((value) => value.toLowerCase().includes(term)),
    )
  }
  if (query.category) {
    const category = cats.find((c) => c.slug === query.category)
    if (category) {
      const ids = [category.id, ...cats.filter((c) => c.parentId === category.id).map((c) => c.id)]
      next = next.filter((p) => p.categoryIds.some((id) => ids.includes(id)))
    }
  }
  if (query.color) next = next.filter((p) => p.colors.some((c) => c.id === query.color))
  if (query.material) next = next.filter((p) => p.materials.includes(query.material!))
  if (query.minPrice != null) next = next.filter((p) => p.price >= query.minPrice!)
  if (query.maxPrice != null) next = next.filter((p) => p.price <= query.maxPrice!)
  if (query.flag) next = next.filter((p) => p.flags[query.flag!])
  next = [...next].sort((a, b) => {
    if (query.sort === 'price-asc') return a.price - b.price
    if (query.sort === 'price-desc') return b.price - a.price
    if (query.sort === 'name') return a.name.localeCompare(b.name)
    if (query.sort === 'newest') return a.sortOrder - b.sortOrder
    return Number(b.flags.featured) - Number(a.flags.featured) || a.sortOrder - b.sortOrder
  })
  const total = next.length
  const offset = query.offset ?? 0
  const limit = query.limit ?? total
  return { items: next.slice(offset, offset + limit), total }
}

export function catalogStats(items: Product[]) {
  const published = items.filter((p) => p.status === 'published' && !p.flags.discontinued)
  const prices = published.map((p) => p.price)
  const materials = [...new Set(published.flatMap((p) => p.materials))].sort()
  return {
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    materials,
  }
}
