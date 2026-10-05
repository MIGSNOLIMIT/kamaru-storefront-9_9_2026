import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { articles, categories, colors, homeSections, products, siteSettings } from '../src/data/catalog.ts'
import { handleCommerceRoutes } from './commerce-routes.ts'
import type { Article, Category, ColorOption, HomeSection, Product, ProductQuery, SiteSettings } from '../src/types.ts'

function normalizeProduct(raw: Partial<Product>): Product {
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

function normalizeSettings(raw: Partial<SiteSettings>, fallback: SiteSettings): SiteSettings {
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

export interface ContentStore {
  products: Product[]
  categories: Category[]
  articles: Article[]
  homeSections: HomeSection[]
  siteSettings: SiteSettings
  colors: ColorOption[]
}

const dataDir = path.join(import.meta.dirname, 'data')
const dataFile = path.join(dataDir, 'content.json')

function seed(): ContentStore {
  return {
    products: structuredClone(products),
    categories: structuredClone(categories),
    articles: structuredClone(articles),
    homeSections: structuredClone(homeSections),
    siteSettings: structuredClone(siteSettings),
    colors: structuredClone(Object.values(colors)),
  }
}

function load(): ContentStore {
  if (!existsSync(dataFile)) {
    const data = seed()
    save(data)
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
  }
}

function save(data: ContentStore) {
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(dataFile, JSON.stringify(data, null, 2))
}

function filterProducts(items: Product[], query: ProductQuery, cats: Category[]) {
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
  return { items: query.limit ? next.slice(0, query.limit) : next, total }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
  return true
}

function cors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk as Buffer))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function parseBody<T>(req: IncomingMessage): Promise<T> {
  const raw = await readBody(req)
  return raw ? JSON.parse(raw) as T : {} as T
}

function match(pathname: string, pattern: string) {
  const keys: string[] = []
  const regex = new RegExp(`^${pattern.replace(/:([^/]+)/g, (_, key: string) => {
    keys.push(key)
    return '([^/]+)'
  })}$`)
  const found = pathname.match(regex)
  if (!found) return null
  return Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]))
}

export async function handleCmsApi(req: IncomingMessage, res: ServerResponse) {
  const rawUrl = req.url ?? '/'
  if (!rawUrl.startsWith('/api/')) return false
  cors(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }
  try {
          const url = new URL(rawUrl, 'http://cms.local')
          const pathname = url.pathname
          const method = req.method ?? 'GET'
          const query = Object.fromEntries(url.searchParams)

          if (await handleCommerceRoutes(req, res, pathname, method, url.searchParams)) return true

          const data = load()

          if (method === 'GET' && pathname === '/api/public/products') {
            return send(res, 200, filterProducts(data.products, {
              search: query.search,
              category: query.category,
              color: query.color,
              minPrice: query.minPrice ? Number(query.minPrice) : undefined,
              maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
              sort: query.sort as ProductQuery['sort'],
              flag: query.flag as ProductQuery['flag'],
              limit: query.limit ? Number(query.limit) : undefined,
            }, data.categories))
          }
          const publicProduct = match(pathname, '/api/public/products/:slug')
          if (method === 'GET' && publicProduct) {
            return send(res, 200, data.products.find((p) => p.slug === publicProduct.slug && p.status === 'published' && !p.flags.discontinued) ?? null)
          }
          if (method === 'GET' && pathname === '/api/public/categories') {
            return send(res, 200, data.categories.filter((c) => c.status === 'published'))
          }
          if (method === 'GET' && pathname === '/api/public/articles') {
            const items = data.articles.filter((a) => a.status === 'published')
            return send(res, 200, { items, total: items.length })
          }
          const publicArticle = match(pathname, '/api/public/articles/:slug')
          if (method === 'GET' && publicArticle) {
            return send(res, 200, data.articles.find((a) => a.slug === publicArticle.slug && a.status === 'published') ?? null)
          }
          const publicSections = match(pathname, '/api/public/sections/:pageKey')
          if (method === 'GET' && publicSections) {
            return send(res, 200, publicSections.pageKey === 'home' ? [...data.homeSections].sort((a, b) => a.sortOrder - b.sortOrder) : [])
          }
          if (method === 'GET' && pathname === '/api/public/settings') {
            return send(res, 200, data.siteSettings)
          }

          if (method === 'GET' && pathname === '/api/admin/snapshot') return send(res, 200, data)
          if (method === 'POST' && pathname === '/api/admin/reset') {
            const next = seed()
            save(next)
            return send(res, 200, next)
          }
          if (method === 'GET' && pathname === '/api/admin/products') return send(res, 200, data.products)
          if (method === 'POST' && pathname === '/api/admin/products') {
            const body = await parseBody<Product>(req)
            if (data.products.some((p) => p.id === body.id || p.slug === body.slug)) return send(res, 409, { error: 'Product id or slug already exists.' })
            data.products.push(body)
            save(data)
            return send(res, 201, body)
          }
          const adminProduct = match(pathname, '/api/admin/products/:id')
          if (adminProduct && method === 'GET') return send(res, 200, data.products.find((p) => p.id === adminProduct.id) ?? null)
          if (adminProduct && method === 'PUT') {
            const body = await parseBody<Product>(req)
            const index = data.products.findIndex((p) => p.id === adminProduct.id)
            if (index < 0) return send(res, 404, { error: 'Product not found.' })
            data.products[index] = body
            save(data)
            return send(res, 200, body)
          }
          if (adminProduct && method === 'DELETE') {
            data.products = data.products.filter((p) => p.id !== adminProduct.id)
            save(data)
            return send(res, 200, { ok: true })
          }

          if (method === 'GET' && pathname === '/api/admin/categories') return send(res, 200, data.categories)
          if (method === 'POST' && pathname === '/api/admin/categories') {
            const body = await parseBody<Category>(req)
            if (data.categories.some((c) => c.id === body.id || c.slug === body.slug)) return send(res, 409, { error: 'Category id or slug already exists.' })
            data.categories.push(body)
            save(data)
            return send(res, 201, body)
          }
          const adminCategory = match(pathname, '/api/admin/categories/:id')
          if (adminCategory && method === 'PUT') {
            const body = await parseBody<Category>(req)
            const index = data.categories.findIndex((c) => c.id === adminCategory.id)
            if (index < 0) return send(res, 404, { error: 'Category not found.' })
            data.categories[index] = body
            save(data)
            return send(res, 200, body)
          }
          if (adminCategory && method === 'DELETE') {
            if (data.categories.some((c) => c.parentId === adminCategory.id)) return send(res, 400, { error: 'Remove child categories first.' })
            if (data.products.some((p) => p.categoryIds.includes(adminCategory.id))) return send(res, 400, { error: 'Category is used by products.' })
            data.categories = data.categories.filter((c) => c.id !== adminCategory.id)
            save(data)
            return send(res, 200, { ok: true })
          }

          if (method === 'GET' && pathname === '/api/admin/articles') return send(res, 200, data.articles)
          if (method === 'POST' && pathname === '/api/admin/articles') {
            const body = await parseBody<Article>(req)
            if (data.articles.some((a) => a.id === body.id || a.slug === body.slug)) return send(res, 409, { error: 'Article id or slug already exists.' })
            data.articles.push(body)
            save(data)
            return send(res, 201, body)
          }
          const adminArticle = match(pathname, '/api/admin/articles/:id')
          if (adminArticle && method === 'GET') return send(res, 200, data.articles.find((a) => a.id === adminArticle.id) ?? null)
          if (adminArticle && method === 'PUT') {
            const body = await parseBody<Article>(req)
            const index = data.articles.findIndex((a) => a.id === adminArticle.id)
            if (index < 0) return send(res, 404, { error: 'Article not found.' })
            data.articles[index] = body
            save(data)
            return send(res, 200, body)
          }
          if (adminArticle && method === 'DELETE') {
            data.articles = data.articles.filter((a) => a.id !== adminArticle.id)
            save(data)
            return send(res, 200, { ok: true })
          }

          if (method === 'PUT' && pathname === '/api/admin/sections') {
            data.homeSections = await parseBody<HomeSection[]>(req)
            save(data)
            return send(res, 200, data.homeSections)
          }
          if (method === 'PUT' && pathname === '/api/admin/settings') {
            data.siteSettings = await parseBody<SiteSettings>(req)
            save(data)
            return send(res, 200, data.siteSettings)
          }

    return send(res, 404, { error: 'Not found.' })
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : 'CMS error' })
  }
}

export function cmsApiPlugin(): Plugin {
  return {
    name: 'kamaru-cms-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await handleCmsApi(req, res)) return
        next()
      })
    },
  }
}
