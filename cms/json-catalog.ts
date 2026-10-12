import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { articles, categories, colors, homeSections, products, siteSettings } from '../src/data/catalog.ts'
import type { Article, Category, ColorOption, HomeSection, Product, SiteSettings } from '../src/types.ts'

export interface ContentStore {
  products: Product[]
  categories: Category[]
  articles: Article[]
  homeSections: HomeSection[]
  siteSettings: SiteSettings
  colors: ColorOption[]
  aboutPage?: Record<string, unknown>
}

const dataDir = path.join(import.meta.dirname, 'data')
export const dataFile = path.join(dataDir, 'content.json')
export const uploadsDir = path.join(import.meta.dirname, 'public', 'uploads')

export function normalizeProduct(raw: Partial<Product>): Product {
  return {
    id: raw.id ?? '',
    slug: raw.slug ?? '',
    name: raw.name ?? '',
    price: raw.price ?? 0,
    currency: 'PHP',
    categoryIds: raw.categoryIds ?? [],
    images: raw.images ?? [],
    shortDescription: raw.shortDescription ?? '',
    features: raw.features ?? [],
    specs: raw.specs ?? {},
    colors: raw.colors ?? [],
    materials: raw.materials ?? ['polyester'],
    marketplace: raw.marketplace ?? {},
    sku: raw.sku,
    inStock: raw.inStock ?? true,
    flags: {
      featured: raw.flags?.featured ?? false,
      newArrival: raw.flags?.newArrival ?? false,
      bestSeller: raw.flags?.bestSeller ?? false,
      discontinued: raw.flags?.discontinued ?? false,
    },
    dataQuality: raw.dataQuality ?? 'placeholder',
    sortOrder: raw.sortOrder ?? 0,
    status: raw.status ?? 'draft',
  }
}

export function normalizeSettings(raw: Partial<SiteSettings>, fallback: SiteSettings): SiteSettings {
  return {
    ...fallback,
    ...raw,
    inquiryEmail: raw.inquiryEmail ?? raw.email ?? fallback.inquiryEmail,
    marketplaceStores: raw.marketplaceStores ?? fallback.marketplaceStores,
    bankDetails: raw.bankDetails ?? fallback.bankDetails,
    social: raw.social ?? fallback.social,
    phones: raw.phones ?? fallback.phones,
  }
}

export function seed(): ContentStore {
  return {
    products: structuredClone(products),
    categories: structuredClone(categories),
    articles: structuredClone(articles),
    homeSections: structuredClone(homeSections),
    siteSettings: structuredClone(siteSettings),
    colors: structuredClone(Object.values(colors)),
  }
}

export function loadJson(): ContentStore {
  if (!existsSync(dataFile)) {
    const data = seed()
    saveJson(data)
    return data
  }
  const parsed = JSON.parse(readFileSync(dataFile, 'utf8')) as Partial<ContentStore>
  const base = seed()
  return {
    products: (parsed.products ?? []).map((p) => normalizeProduct(p)),
    categories: parsed.categories?.length ? parsed.categories : base.categories,
    articles: parsed.articles ?? [],
    homeSections: parsed.homeSections ?? [],
    siteSettings: normalizeSettings(parsed.siteSettings ?? {}, base.siteSettings),
    colors: parsed.colors ?? base.colors,
    aboutPage: parsed.aboutPage as Record<string, unknown> | undefined,
  }
}

export function saveJson(data: ContentStore) {
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(dataFile, JSON.stringify(data, null, 2))
}

export { filterProducts, catalogStats } from '../src/lib/product-filter.ts'

export function propagateColor(data: ContentStore, color: ColorOption) {
  data.colors = data.colors.map((c) => (c.id === color.id ? color : c))
  data.products = data.products.map((p) => ({
    ...p,
    colors: p.colors.map((c) => (c.id === color.id ? { ...color } : c)),
  }))
}

export function colorInUse(data: ContentStore, id: string) {
  return data.products.some((p) => p.colors.some((c) => c.id === id))
}
