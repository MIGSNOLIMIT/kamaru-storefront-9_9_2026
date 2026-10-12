import { articles, categories, colors, homeSections, products, siteSettings } from './data/catalog'
import type { ContentSource, ProductQuery } from './types'
import { catalogStats as computeStats, filterProducts } from './lib/product-filter'

const delay = async () => Promise.resolve()

export const localContentSource: ContentSource = {
  async listProducts(query: ProductQuery = {}) {
    await delay()
    return filterProducts(products, query, categories)
  },
  async getProductsByIds(ids) {
    await delay()
    return products.filter((p) => ids.includes(p.id) && p.status === 'published' && !p.flags?.discontinued)
  },
  async getProduct(slug) {
    await delay()
    const p = products.find((item) => item.slug === slug)
    if (!p || p.status !== 'published' || p.flags?.discontinued) return null
    return p
  },
  async getCategoryTree() {
    await delay()
    return categories.filter((c) => c.status === 'published')
  },
  async listColors() {
    await delay()
    return Object.values(colors)
  },
  async getCatalogStats() {
    await delay()
    return computeStats(products)
  },
  async listArticles() {
    await delay()
    return { items: articles.filter((a) => a.status === 'published'), total: articles.length }
  },
  async getArticle(slug) {
    await delay()
    return articles.find((a) => a.slug === slug && a.status === 'published') ?? null
  },
  async listSections(pageKey) {
    await delay()
    return pageKey === 'home' ? homeSections : []
  },
  async getSiteSettings() {
    await delay()
    return siteSettings
  },
  async getAboutPage() {
    await delay()
    return null
  },
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
  if (query.material) params.set('material', query.material)
  if (query.minPrice != null) params.set('minPrice', String(query.minPrice))
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice))
  if (query.sort) params.set('sort', query.sort)
  if (query.flag) params.set('flag', query.flag)
  if (query.limit != null) params.set('limit', String(query.limit))
  if (query.offset != null) params.set('offset', String(query.offset))
  const q = params.toString()
  return q ? `?${q}` : ''
}

export const httpContentSource: ContentSource = {
  listProducts: (query = {}) => cmsGet(`/api/public/products${productQuery(query)}`),
  getProductsByIds: (ids) => cmsGet(`/api/public/products/by-ids?ids=${encodeURIComponent(ids.join(','))}`),
  getProduct: (slug) => cmsGet(`/api/public/products/${encodeURIComponent(slug)}`),
  getCategoryTree: () => cmsGet('/api/public/categories'),
  listColors: () => cmsGet('/api/public/colors'),
  getCatalogStats: () => cmsGet('/api/public/catalog-stats'),
  listArticles: () => cmsGet('/api/public/articles'),
  getArticle: (slug) => cmsGet(`/api/public/articles/${encodeURIComponent(slug)}`),
  listSections: (pageKey) => cmsGet(`/api/public/sections/${encodeURIComponent(pageKey)}`),
  getSiteSettings: () => cmsGet('/api/public/settings'),
  getAboutPage: () => cmsGet('/api/public/about'),
}

export const contentSource: ContentSource = httpContentSource
