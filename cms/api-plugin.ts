import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { requireStaff } from './commerce-routes.ts'
import { mergeSettingsForStaffRole } from './staff-roles.ts'
import {
  catalogStats,
  colorInUse,
  filterProducts,
  propagateColor,
  uploadsDir,
  type ContentStore,
} from './json-catalog.ts'
import { loadCatalog, saveCatalog, uploadBrandAsset, listMediaAssets, insertNewsletter, listInquiriesSupabase, signedPaymentProofUrl, getSupabaseAdmin } from './supabase-catalog.ts'
import { handleCommerceRoutes } from './commerce-routes.ts'
import type { Article, Category, ColorOption, HomeSection, Product, ProductQuery, SiteSettings } from '../src/types.ts'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function slugifyColorId(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'color'
}

function normalizeHex(input: string): string | null {
  const raw = input.trim()
  const hex = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null
  return hex.toLowerCase()
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Kamaru-Staff-Token')
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

async function staffOnly(req: IncomingMessage, res: ServerResponse) {
  if (!await requireStaff(req)) {
    send(res, 401, { error: 'Unauthorized' })
    return false
  }
  return true
}

async function persist(data: ContentStore) {
  await saveCatalog(data)
}

function parseProductQuery(query: Record<string, string>): ProductQuery {
  return {
    search: query.search,
    category: query.category,
    color: query.color,
    material: query.material as ProductQuery['material'],
    minPrice: query.minPrice ? Number(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? Number(query.maxPrice) : query.max ? Number(query.max) : undefined,
    sort: query.sort as ProductQuery['sort'],
    flag: query.flag as ProductQuery['flag'],
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined,
  }
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

    const data = await loadCatalog()

    if (method === 'GET' && pathname === '/api/public/catalog-stats') {
      return send(res, 200, catalogStats(data.products))
    }

    if (method === 'GET' && pathname === '/api/public/products') {
      return send(res, 200, filterProducts(data.products, parseProductQuery(query), data.categories))
    }

    if (method === 'GET' && pathname === '/api/public/products/by-ids') {
      const ids = (query.ids ?? '').split(',').filter(Boolean)
      const items = data.products.filter(
        (p) => ids.includes(p.id) && p.status === 'published' && !p.flags.discontinued,
      )
      return send(res, 200, items)
    }

    const publicProduct = match(pathname, '/api/public/products/:slug')
    if (method === 'GET' && publicProduct && publicProduct.slug !== 'by-ids') {
      return send(
        res,
        200,
        data.products.find((p) => p.slug === publicProduct.slug && p.status === 'published' && !p.flags.discontinued) ?? null,
      )
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
    if (method === 'GET' && pathname === '/api/public/colors') {
      return send(res, 200, data.colors)
    }
    if (method === 'GET' && pathname === '/api/public/about') {
      return send(res, 200, data.aboutPage ?? null)
    }

    if (method === 'POST' && pathname === '/api/public/newsletter') {
      const body = await parseBody<{ email: string; consent?: boolean }>(req)
      if (!body.email?.trim()) return send(res, 400, { error: 'Email is required.' })
      if (!body.consent) return send(res, 400, { error: 'Consent is required.' })
      await insertNewsletter(body.email.trim().toLowerCase(), true)
      return send(res, 201, { ok: true })
    }

    // Admin catalog (staff token required)
    const adminPaths = ['/api/admin/snapshot', '/api/admin/colors', '/api/admin/upload-image', '/api/admin/products', '/api/admin/categories', '/api/admin/articles', '/api/admin/sections', '/api/admin/settings', '/api/admin/media', '/api/admin/about', '/api/admin/inquiries']
    const isAdminCatalog =
      adminPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
      pathname.startsWith('/api/admin/products/') ||
      pathname.startsWith('/api/admin/categories/') ||
      pathname.startsWith('/api/admin/articles/') ||
      pathname.startsWith('/api/admin/colors/') ||
      pathname.startsWith('/api/admin/media/')

    if (isAdminCatalog && !(await staffOnly(req, res))) return true

    if (method === 'GET' && pathname === '/api/admin/snapshot') return send(res, 200, data)

    if (method === 'GET' && pathname === '/api/admin/inquiries') {
      const remote = await listInquiriesSupabase()
      if (remote) return send(res, 200, remote)
      const { loadCommerce } = await import('./commerce-store.ts')
      return send(res, 200, loadCommerce().inquiries)
    }

    if (method === 'GET' && pathname === '/api/admin/media') {
      return send(res, 200, await listMediaAssets())
    }

    const adminMedia = match(pathname, '/api/admin/media/:id')
    if (adminMedia && method === 'DELETE') {
      const sb = getSupabaseAdmin()
      if (!sb) return send(res, 501, { error: 'Media library requires Supabase.' })
      const urlRefs = JSON.stringify(data)
      const { data: asset } = await sb.from('media_assets').select('*').eq('id', adminMedia.id).maybeSingle()
      if (!asset) return send(res, 404, { error: 'Asset not found.' })
      if (urlRefs.includes(asset.public_url)) {
        return send(res, 400, { error: 'This image is still used in catalog content.' })
      }
      await sb.storage.from(asset.bucket).remove([asset.path])
      await sb.from('media_assets').delete().eq('id', adminMedia.id)
      return send(res, 200, { ok: true })
    }

    if (method === 'GET' && pathname === '/api/admin/about') return send(res, 200, data.aboutPage ?? null)
    if (method === 'PUT' && pathname === '/api/admin/about') {
      data.aboutPage = await parseBody(req)
      await persist(data)
      return send(res, 200, data.aboutPage)
    }

    if (method === 'GET' && pathname === '/api/admin/colors') return send(res, 200, data.colors)
    if (method === 'POST' && pathname === '/api/admin/colors') {
      const body = await parseBody<{ name: string; hex: string; id?: string }>(req)
      const hex = normalizeHex(body.hex)
      if (!body.name?.trim() || !hex) return send(res, 400, { error: 'Valid color name and hex (#RRGGBB) are required.' })
      const id = body.id?.trim() || slugifyColorId(body.name)
      if (data.colors.some((c) => c.id === id)) return send(res, 409, { error: 'A color with this id already exists.' })
      const color: ColorOption = { id, name: body.name.trim(), hex }
      data.colors.push(color)
      await persist(data)
      return send(res, 201, color)
    }
    const adminColor = match(pathname, '/api/admin/colors/:id')
    if (adminColor && method === 'PUT') {
      const body = await parseBody<{ name: string; hex: string }>(req)
      const hex = normalizeHex(body.hex)
      const index = data.colors.findIndex((c) => c.id === adminColor.id)
      if (index < 0) return send(res, 404, { error: 'Color not found.' })
      if (!body.name?.trim() || !hex) return send(res, 400, { error: 'Valid color name and hex (#RRGGBB) are required.' })
      const updated: ColorOption = { id: adminColor.id, name: body.name.trim(), hex }
      propagateColor(data, updated)
      await persist(data)
      return send(res, 200, updated)
    }
    if (adminColor && method === 'DELETE') {
      if (colorInUse(data, adminColor.id)) {
        return send(res, 400, { error: 'Remove this color from all products before deleting it.' })
      }
      data.colors = data.colors.filter((c) => c.id !== adminColor.id)
      await persist(data)
      return send(res, 200, { ok: true })
    }

    if (method === 'POST' && pathname === '/api/admin/upload-image') {
      const body = await parseBody<{ fileName: string; dataUrl: string }>(req)
      const matchData = body.dataUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i)
      if (!matchData) return send(res, 400, { error: 'Upload a JPG, PNG, or WebP image.' })
      const buffer = Buffer.from(matchData[2], 'base64')
      if (buffer.length > MAX_UPLOAD_BYTES) return send(res, 400, { error: 'Image must be 5 MB or smaller.' })
      const ext = matchData[1] === 'image/png' ? '.png' : matchData[1] === 'image/webp' ? '.webp' : '.jpg'
      const safeBase = (body.fileName ?? 'image').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/\.[^.]+$/, '') || 'image'
      const fileName = `${safeBase}-${randomUUID().slice(0, 8)}${ext}`
      try {
        const uploaded = await uploadBrandAsset(buffer, fileName, matchData[1])
        return send(res, 200, { url: uploaded.url, id: uploaded.id })
      } catch {
        mkdirSync(uploadsDir, { recursive: true })
        writeFileSync(path.join(uploadsDir, fileName), buffer)
        return send(res, 200, { url: `/cms/uploads/${fileName}` })
      }
    }

    if (method === 'GET' && pathname === '/api/admin/products') return send(res, 200, data.products)
    if (method === 'POST' && pathname === '/api/admin/products') {
      const body = await parseBody<Product>(req)
      if (data.products.some((p) => p.id === body.id || p.slug === body.slug)) return send(res, 409, { error: 'Product id or slug already exists.' })
      data.products.push(body)
      await persist(data)
      return send(res, 201, body)
    }
    const adminProduct = match(pathname, '/api/admin/products/:id')
    if (adminProduct && method === 'GET') return send(res, 200, data.products.find((p) => p.id === adminProduct.id) ?? null)
    if (adminProduct && method === 'PUT') {
      const body = await parseBody<Product>(req)
      const index = data.products.findIndex((p) => p.id === adminProduct.id)
      if (index < 0) return send(res, 404, { error: 'Product not found.' })
      data.products[index] = body
      await persist(data)
      return send(res, 200, body)
    }
    if (adminProduct && method === 'DELETE') {
      data.products = data.products.filter((p) => p.id !== adminProduct.id)
      await persist(data)
      return send(res, 200, { ok: true })
    }

    if (method === 'GET' && pathname === '/api/admin/categories') return send(res, 200, data.categories)
    if (method === 'POST' && pathname === '/api/admin/categories') {
      const body = await parseBody<Category>(req)
      if (data.categories.some((c) => c.id === body.id || c.slug === body.slug)) return send(res, 409, { error: 'Category id or slug already exists.' })
      data.categories.push(body)
      await persist(data)
      return send(res, 201, body)
    }
    const adminCategory = match(pathname, '/api/admin/categories/:id')
    if (adminCategory && method === 'PUT') {
      const body = await parseBody<Category>(req)
      const index = data.categories.findIndex((c) => c.id === adminCategory.id)
      if (index < 0) return send(res, 404, { error: 'Category not found.' })
      data.categories[index] = body
      await persist(data)
      return send(res, 200, body)
    }
    if (adminCategory && method === 'DELETE') {
      if (data.categories.some((c) => c.parentId === adminCategory.id)) return send(res, 400, { error: 'Remove child categories first.' })
      if (data.products.some((p) => p.categoryIds.includes(adminCategory.id))) return send(res, 400, { error: 'Category is used by products.' })
      data.categories = data.categories.filter((c) => c.id !== adminCategory.id)
      await persist(data)
      return send(res, 200, { ok: true })
    }

    if (method === 'GET' && pathname === '/api/admin/articles') return send(res, 200, data.articles)
    if (method === 'POST' && pathname === '/api/admin/articles') {
      const body = await parseBody<Article>(req)
      if (data.articles.some((a) => a.id === body.id || a.slug === body.slug)) return send(res, 409, { error: 'Article id or slug already exists.' })
      data.articles.push(body)
      await persist(data)
      return send(res, 201, body)
    }
    const adminArticle = match(pathname, '/api/admin/articles/:id')
    if (adminArticle && method === 'GET') return send(res, 200, data.articles.find((a) => a.id === adminArticle.id) ?? null)
    if (adminArticle && method === 'PUT') {
      const body = await parseBody<Article>(req)
      const index = data.articles.findIndex((a) => a.id === adminArticle.id)
      if (index < 0) return send(res, 404, { error: 'Article not found.' })
      data.articles[index] = body
      await persist(data)
      return send(res, 200, body)
    }
    if (adminArticle && method === 'DELETE') {
      data.articles = data.articles.filter((a) => a.id !== adminArticle.id)
      await persist(data)
      return send(res, 200, { ok: true })
    }

    if (method === 'PUT' && pathname === '/api/admin/sections') {
      data.homeSections = await parseBody<HomeSection[]>(req)
      await persist(data)
      return send(res, 200, data.homeSections)
    }
    if (method === 'PUT' && pathname === '/api/admin/settings') {
      const staff = await requireStaff(req)
      if (!staff) return send(res, 401, { error: 'Unauthorized' })
      const body = await parseBody<SiteSettings>(req)
      data.siteSettings = mergeSettingsForStaffRole(body, data.siteSettings, staff.profile.role)
      await persist(data)
      return send(res, 200, data.siteSettings)
    }

    const proofRoute = match(pathname, '/api/admin/orders/:id/payment-proof-url')
    if (proofRoute && method === 'GET') {
      if (!await requireStaff(req)) return send(res, 401, { error: 'Unauthorized' })
      const { loadCommerce } = await import('./commerce-store.ts')
      const order = loadCommerce().orders.find((o) => o.id === proofRoute.id)
      if (!order?.paymentProofUrl) return send(res, 404, { error: 'No payment proof.' })
      const signed = await signedPaymentProofUrl(order.paymentProofUrl)
      return send(res, 200, { url: signed ?? order.paymentProofUrl })
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
