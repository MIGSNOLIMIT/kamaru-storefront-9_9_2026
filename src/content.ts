import { articles, categories, colors, homeSections, products, siteSettings } from './data/catalog'
import type { ContentSource, ProductQuery } from './types'

const delay = async () => Promise.resolve()

export const localContentSource: ContentSource = {
  async listProducts(query: ProductQuery = {}) {
    await delay()
    let items = products.filter((product) => product.status === 'published' && !product.flags?.discontinued)
    if (query.search) {
      const term = query.search.toLowerCase()
      items = items.filter((p) =>
        [p.name, p.shortDescription, ...p.features].some((value) => value.toLowerCase().includes(term)),
      )
    }
    if (query.category) {
      const category = categories.find((c) => c.slug === query.category)
      if (category) {
        const ids = [category.id, ...categories.filter((c) => c.parentId === category.id).map((c) => c.id)]
        items = items.filter((p) => p.categoryIds.some((id) => ids.includes(id)))
      }
    }
    if (query.color) items = items.filter((p) => p.colors.some((c) => c.id === query.color))
    if (query.minPrice != null) items = items.filter((p) => p.price >= query.minPrice!)
    if (query.maxPrice != null) items = items.filter((p) => p.price <= query.maxPrice!)
    if (query.flag) items = items.filter((p) => p.flags[query.flag!])
    items = [...items].sort((a, b) => {
      if (query.sort === 'price-asc') return a.price - b.price
      if (query.sort === 'price-desc') return b.price - a.price
      if (query.sort === 'name') return a.name.localeCompare(b.name)
      if (query.sort === 'newest') return a.sortOrder - b.sortOrder
      return Number(b.flags.featured) - Number(a.flags.featured) || a.sortOrder - b.sortOrder
    })
    const total = items.length
    return { items: query.limit ? items.slice(0, query.limit) : items, total }
  },
  async getProduct(slug) {
    await delay()
    const p = products.find((item) => item.slug === slug)
    if (!p || p.status !== 'published' || p.flags?.discontinued) return null
    return p
  },
  async getCategoryTree() { await delay(); return categories.filter((c) => c.status === 'published') },
  async listColors() { await delay(); return Object.values(colors) },
  async listArticles() { await delay(); return { items: articles, total: articles.length } },
  async getArticle(slug) { await delay(); return articles.find((a) => a.slug === slug) ?? null },
  async listSections(pageKey) { await delay(); return pageKey === 'home' ? homeSections : [] },
  async getSiteSettings() { await delay(); return siteSettings },
}

const cmsUrl = String(import.meta.env.VITE_CMS_URL ?? '').replace(/\/$/, '')

async function cmsGet<T>(path: string): Promise<T> {
  const res = await fetch(`${cmsUrl}${path}`)
  if (!res.ok) throw new Error(`CMS request failed (${res.status})`)
  return res.json() as Promise<T>
}

function productQuery(query: ProductQuery = {}) {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.category) params.set('category', query.category)
  if (query.color) params.set('color', query.color)
  if (query.minPrice != null) params.set('minPrice', String(query.minPrice))
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice))
  if (query.sort) params.set('sort', query.sort)
  if (query.flag) params.set('flag', query.flag)
  if (query.limit != null) params.set('limit', String(query.limit))
  const q = params.toString()
  return q ? `?${q}` : ''
}

export const httpContentSource: ContentSource = {
  listProducts: (query = {}) => cmsGet(`/api/public/products${productQuery(query)}`),
  getProduct: (slug) => cmsGet(`/api/public/products/${encodeURIComponent(slug)}`),
  getCategoryTree: () => cmsGet('/api/public/categories'),
  listColors: () => cmsGet('/api/public/colors'),
  listArticles: () => cmsGet('/api/public/articles'),
  getArticle: (slug) => cmsGet(`/api/public/articles/${encodeURIComponent(slug)}`),
  listSections: (pageKey) => cmsGet(`/api/public/sections/${encodeURIComponent(pageKey)}`),
  getSiteSettings: () => cmsGet('/api/public/settings'),
}

export const contentSource: ContentSource = httpContentSource
