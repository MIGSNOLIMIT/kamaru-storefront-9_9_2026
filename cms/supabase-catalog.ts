import path from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseServiceConfig } from './env-server.ts'
import type { ContentStore } from './json-catalog.ts'
import { loadJson, saveJson, seed } from './json-catalog.ts'
import type { Article, Category, HomeSection, Product, SiteSettings } from '../src/types.ts'

let client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient | null {
  const { url, serviceKey, configured } = supabaseServiceConfig()
  if (!configured) return null
  if (!client) client = createClient(url, serviceKey, { auth: { persistSession: false } })
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

export async function loadSupabaseSnapshot(): Promise<ContentStore | null> {
  const sb = getSupabaseAdmin()
  if (!sb) return null

  const { count } = await sb.from('products').select('*', { count: 'exact', head: true })
  if (!count) {
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
  if (!sb) {
    saveJson(data)
    return
  }

  await sb.from('products').delete().neq('id', '')
  if (data.products.length) {
    const { error } = await sb.from('products').upsert(data.products.map(productToRow))
    if (error) throw new Error(error.message)
  }

  await sb.from('categories').delete().neq('id', '')
  if (data.categories.length) {
    const { error } = await sb.from('categories').upsert(data.categories.map(categoryToRow))
    if (error) throw new Error(error.message)
  }

  await sb.from('articles').delete().neq('id', '')
  if (data.articles.length) {
    const { error } = await sb.from('articles').upsert(data.articles.map(articleToRow))
    if (error) throw new Error(error.message)
  }

  await sb.from('home_sections').delete().eq('page_key', 'home')
  if (data.homeSections.length) {
    const rows = data.homeSections.map((section, sortOrder) => ({
      id: section.id,
      page_key: 'home',
      section,
      sort_order: sortOrder,
    }))
    const { error } = await sb.from('home_sections').insert(rows)
    if (error) throw new Error(error.message)
  }

  const { error: settingsErr } = await sb.from('site_settings').upsert({ id: 1, settings: data.siteSettings })
  if (settingsErr) throw new Error(settingsErr.message)

  await sb.from('colors').delete().neq('id', '')
  if (data.colors.length) {
    const { error } = await sb.from('colors').insert(data.colors)
    if (error) throw new Error(error.message)
  }

  if (data.aboutPage) {
    await sb.from('pages').upsert({ id: 'about', content: data.aboutPage })
  }
}

async function seedSupabaseFromStore(data: ContentStore) {
  await saveSupabaseSnapshot(data)
}

export async function loadCatalog(): Promise<ContentStore> {
  try {
    const fromSb = await loadSupabaseSnapshot()
    if (fromSb) return fromSb
  } catch (e) {
    console.warn('[catalog] Supabase load failed, using JSON:', e)
  }
  return loadJson()
}

export async function saveCatalog(data: ContentStore): Promise<void> {
  saveJson(data)
  const sb = getSupabaseAdmin()
  if (sb) {
    try {
      await saveSupabaseSnapshot(data)
    } catch (e) {
      console.warn('[catalog] Supabase save failed:', e)
    }
  }
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
