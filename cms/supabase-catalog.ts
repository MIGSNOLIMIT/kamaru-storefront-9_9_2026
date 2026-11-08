import path from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import ws from 'ws'
import { supabaseServiceConfig } from './env-server.ts'
import type { ContentStore } from './json-catalog.ts'
import { loadJson, saveJson, seed } from './json-catalog.ts'
import type { Article, Category, HomeSection, Product, SiteSettings } from '../src/types.ts'

let client: SupabaseClient | null = null
let remoteDownUntil = 0
let remoteWarningShown = false

const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(5000)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  return fetch(input, { ...init, signal })
}

function errorText(error: unknown) {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause
  const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : ''
  const causeMessage = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : ''
  return [error.message, code, causeMessage].filter(Boolean).join(': ')
}

function isRemoteUnavailable(error: unknown) {
  return /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|ENETUNREACH|ECONNRESET|fetch failed|TimeoutError|timed out/i.test(errorText(error))
}

function remoteRecentlyDown() {
  return Date.now() < remoteDownUntil
}

function markRemoteDown(error: unknown) {
  remoteDownUntil = Date.now() + 30_000
  if (remoteWarningShown) return
  remoteWarningShown = true
  console.warn('[catalog] Supabase is unreachable, using local JSON:', errorText(error))
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const { url, serviceKey, configured } = supabaseServiceConfig()
  if (!configured) return null
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws as never },
      global: { fetch: fetchWithTimeout },
    })
  }
  return client
}

function rowToProduct(r: Record<string, unknown>): Product {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    price: Number(r.price),
    currency: 'PHP',
    categoryIds: (r.category_ids as string[]) ?? [],
    images: (r.images as Product['images']) ?? [],
    shortDescription: String(r.short_description ?? ''),
    features: (r.features as string[]) ?? [],
    specs: (r.specs as Product['specs']) ?? {},
    colors: (r.colors as Product['colors']) ?? [],
    materials: (r.materials as Product['materials']) ?? ['polyester'],
    marketplace: (r.marketplace as Product['marketplace']) ?? {},
    sku: r.sku ? String(r.sku) : undefined,
    inStock: Boolean(r.in_stock ?? true),
    flags: (r.flags as Product['flags']) ?? {
      featured: false,
      newArrival: false,
      bestSeller: false,
      discontinued: false,
    },
    dataQuality: (r.data_quality as Product['dataQuality']) ?? 'placeholder',
    sortOrder: Number(r.sort_order ?? 0),
    status: (r.status as Product['status']) ?? 'draft',
  }
}

function productToRow(p: Product) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    currency: p.currency,
    category_ids: p.categoryIds,
    images: p.images,
    short_description: p.shortDescription,
    features: p.features,
    specs: p.specs,
    colors: p.colors,
    materials: p.materials,
    marketplace: p.marketplace,
    sku: p.sku ?? null,
    in_stock: p.inStock,
    flags: p.flags,
    data_quality: p.dataQuality,
    sort_order: p.sortOrder,
    status: p.status,
  }
}

function rowToCategory(r: Record<string, unknown>): Category {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    parentId: r.parent_id ? String(r.parent_id) : undefined,
    description: String(r.description ?? ''),
    image: (r.image as Category['image']) ?? { id: 'cat', alt: '', width: 1600, height: 900 },
    sortOrder: Number(r.sort_order ?? 0),
    status: (r.status as Category['status']) ?? 'draft',
  }
}

function categoryToRow(c: Category) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    parent_id: c.parentId ?? null,
    description: c.description,
    image: c.image,
    sort_order: c.sortOrder,
    status: c.status,
  }
}

function rowToArticle(r: Record<string, unknown>): Article {
  const bodyRaw = r.body
  let body: Article['body']
  if (Array.isArray(bodyRaw) && bodyRaw.length && typeof bodyRaw[0] === 'object') {
    body = bodyRaw as Article['body']
  } else if (Array.isArray(bodyRaw)) {
    body = (bodyRaw as string[]).map((text) => ({ type: 'paragraph' as const, text }))
  } else {
    body = []
  }
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title ?? ''),
    excerpt: String(r.excerpt ?? ''),
    body,
    category: String(r.category ?? ''),
    publishedAt: String(r.published_at ?? new Date().toISOString().slice(0, 10)),
    image: (r.image as Article['image']) ?? { id: 'article', alt: '', width: 1600, height: 900 },
    sortOrder: Number(r.sort_order ?? 0),
    status: (r.status as Article['status']) ?? 'draft',
  }
}

function articleToRow(a: Article) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    category: a.category,
    published_at: a.publishedAt,
    image: a.image,
    sort_order: a.sortOrder,
    status: a.status,
  }
}

async function syncRowsById(
  sb: SupabaseClient,
  table: 'products' | 'categories' | 'articles' | 'colors',
  rows: Record<string, unknown>[],
  idField = 'id',
) {
  const ids = rows.map((r) => String(r[idField]))
  if (rows.length) {
    const { error } = await sb.from(table).upsert(rows)
    if (error) throw new Error(`${table} upsert: ${error.message}`)
  }
  const { data: existing, error: listErr } = await sb.from(table).select(idField)
  if (listErr) throw new Error(`${table} list: ${listErr.message}`)
  const removeIds = (existing ?? [])
    .map((r) => String((r as { id?: string })[idField as 'id'] ?? ''))
    .filter((rowId) => rowId && !ids.includes(rowId))
  if (removeIds.length) {
    const { error: delErr } = await sb.from(table).delete().in(idField, removeIds)
    if (delErr) throw new Error(`${table} delete: ${delErr.message}`)
  }
}

export async function loadSupabaseSnapshot(): Promise<ContentStore | null> {
  const sb = getSupabaseAdmin()
  if (!sb) return null

  const { count, error: countError } = await sb.from('products').select('*', { count: 'exact', head: true })
  if (countError) throw new Error(countError.message)
  if (count === 0) {
    const json = loadJson()
    await seedSupabaseFromStore(json)
    return json
  }

  const [prods, cats, arts, secs, sett, cols, page] = await Promise.all([
    sb.from('products').select('*').order('sort_order'),
    sb.from('categories').select('*').order('sort_order'),
    sb.from('articles').select('*').order('sort_order'),
    sb.from('home_sections').select('*').eq('page_key', 'home').order('sort_order'),
    sb.from('site_settings').select('settings').eq('id', 1).maybeSingle(),
    sb.from('colors').select('*'),
    sb.from('pages').select('content').eq('id', 'about').maybeSingle(),
  ])

  if (prods.error) throw new Error(prods.error.message)
  if (cats.error) throw new Error(cats.error.message)
  if (arts.error) throw new Error(arts.error.message)
  if (secs.error) throw new Error(secs.error.message)
  if (cols.error) throw new Error(cols.error.message)

  return {
    products: (prods.data ?? []).map((r) => rowToProduct(r)),
    categories: (cats.data ?? []).map((r) => rowToCategory(r)),
    articles: (arts.data ?? []).map((r) => rowToArticle(r)),
    homeSections: (secs.data ?? []).map((r) => r.section as HomeSection),
    siteSettings: (sett.data?.settings as SiteSettings) ?? seed().siteSettings,
    colors: (cols.data ?? []).map((r) => ({ id: String(r.id), name: String(r.name), hex: String(r.hex) })),
    aboutPage: page.data?.content as Record<string, unknown> | undefined,
  }
}

export async function saveSupabaseSnapshot(data: ContentStore): Promise<void> {
  const sb = getSupabaseAdmin()
  if (!sb) throw new Error('Supabase is not configured.')

  await syncRowsById(sb, 'products', data.products.map(productToRow))
  await syncRowsById(sb, 'categories', data.categories.map(categoryToRow))
  await syncRowsById(sb, 'articles', data.articles.map(articleToRow))
  await syncRowsById(sb, 'colors', data.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex })))

  const homeIds = data.homeSections.map((s) => s.id)
  if (data.homeSections.length) {
    const rows = data.homeSections.map((section, sortOrder) => ({
      id: section.id,
      page_key: 'home',
      section,
      sort_order: sortOrder,
    }))
    const { error } = await sb.from('home_sections').upsert(rows)
    if (error) throw new Error(`home_sections upsert: ${error.message}`)
  }
  const { data: homeExisting, error: homeListErr } = await sb
    .from('home_sections')
    .select('id')
    .eq('page_key', 'home')
  if (homeListErr) throw new Error(`home_sections list: ${homeListErr.message}`)
  const homeRemove = (homeExisting ?? [])
    .map((r) => String(r.id))
    .filter((id) => !homeIds.includes(id))
  if (homeRemove.length) {
    const { error: homeDelErr } = await sb.from('home_sections').delete().in('id', homeRemove)
    if (homeDelErr) throw new Error(`home_sections delete: ${homeDelErr.message}`)
  }

  const { error: settingsErr } = await sb.from('site_settings').upsert({ id: 1, settings: data.siteSettings })
  if (settingsErr) throw new Error(settingsErr.message)

  if (data.aboutPage) {
    const { error: pageErr } = await sb.from('pages').upsert({ id: 'about', content: data.aboutPage })
    if (pageErr) throw new Error(pageErr.message)
  }
}

async function seedSupabaseFromStore(data: ContentStore) {
  await saveSupabaseSnapshot(data)
}

export async function loadCatalog(): Promise<ContentStore> {
  if (!remoteRecentlyDown()) {
    try {
      const fromSb = await loadSupabaseSnapshot()
      if (fromSb) {
        remoteDownUntil = 0
        remoteWarningShown = false
        return fromSb
      }
    } catch (e) {
      if (isRemoteUnavailable(e)) markRemoteDown(e)
      else console.warn('[catalog] Supabase load failed, using JSON:', e)
    }
  }
  return loadJson()
}

export async function saveCatalog(data: ContentStore): Promise<void> {
  if (!remoteRecentlyDown()) {
    try {
      const sb = getSupabaseAdmin()
      if (sb) await saveSupabaseSnapshot(data)
    } catch (error) {
      saveJson(data)
      if (isRemoteUnavailable(error)) {
        markRemoteDown(error)
        return
      }
      console.warn('[catalog] Supabase save failed, wrote local JSON:', error)
      throw error
    }
  }
  saveJson(data)
}

export async function uploadBrandAsset(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<{ url: string; id: string; path: string }> {
  const sb = getSupabaseAdmin()
  if (!sb) throw new Error('Supabase not configured for uploads.')
  const path = `catalog/${fileName}`
  const { error } = await sb.storage.from('brand-assets').upload(path, buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data: pub } = sb.storage.from('brand-assets').getPublicUrl(path)
  const { data: row, error: insErr } = await sb
    .from('media_assets')
    .insert({ bucket: 'brand-assets', path, public_url: pub.publicUrl })
    .select('id')
    .single()
  if (insErr) throw new Error(insErr.message)
  return { url: pub.publicUrl, id: String(row.id), path }
}

export async function listMediaAssets() {
  const sb = getSupabaseAdmin()
  if (!sb) return []
  const { data, error } = await sb.from('media_assets').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function signedPaymentProofUrl(storedPath: string): Promise<string | null> {
  const sb = getSupabaseAdmin()
  if (!sb || !storedPath) return null
  const path = storedPath.startsWith('payment-proofs/') ? storedPath.replace(/^payment-proofs\//, '') : storedPath
  const { data, error } = await sb.storage.from('payment-proofs').createSignedUrl(path, 3600)
  if (error) return null
  return data.signedUrl
}

export async function insertNewsletter(email: string, consent: boolean) {
  const sb = getSupabaseAdmin()
  if (sb) {
    const { error } = await sb.from('newsletter_subscribers').upsert({ email, consent })
    if (error) throw new Error(error.message)
    return
  }
  const file = path.join(import.meta.dirname, 'data', 'newsletter.json')
  mkdirSync(path.dirname(file), { recursive: true })
  const list: { email: string; consent: boolean; createdAt: string }[] = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : []
  if (!list.some((x) => x.email === email)) list.push({ email, consent, createdAt: new Date().toISOString() })
  writeFileSync(file, JSON.stringify(list, null, 2))
}

export async function listInquiriesSupabase() {
  const sb = getSupabaseAdmin()
  if (!sb) return null
  const { data, error } = await sb.from('inquiries').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}
