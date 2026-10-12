import type { AboutPageContent, Article, Category, ColorOption, HomeSection, Product, SiteSettings } from '../../src/types'

export interface Snapshot {
  products: Product[]
  categories: Category[]
  articles: Article[]
  homeSections: HomeSection[]
  siteSettings: SiteSettings
  colors: ColorOption[]
  aboutPage?: AboutPageContent
}

let staffToken: string | null = null

export function setStaffToken(token: string | null) {
  staffToken = token
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(staffToken ? { 'X-Kamaru-Staff-Token': staffToken } : {}),
      ...init?.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  return body as T
}

export const api = {
  snapshot: () => request<Snapshot>('/api/admin/snapshot'),
  saveProduct: (product: Product, isNew: boolean) =>
    request<Product>(isNew ? '/api/admin/products' : `/api/admin/products/${encodeURIComponent(product.id)}`, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(product),
    }),
  deleteProduct: (id: string) => request<{ ok: boolean }>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveCategory: (category: Category, isNew: boolean) =>
    request<Category>(isNew ? '/api/admin/categories' : `/api/admin/categories/${encodeURIComponent(category.id)}`, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(category),
    }),
  deleteCategory: (id: string) => request<{ ok: boolean }>(`/api/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveArticle: (article: Article, isNew: boolean) =>
    request<Article>(isNew ? '/api/admin/articles' : `/api/admin/articles/${encodeURIComponent(article.id)}`, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(article),
    }),
  deleteArticle: (id: string) => request<{ ok: boolean }>(`/api/admin/articles/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveSections: (sections: HomeSection[]) => request<HomeSection[]>('/api/admin/sections', { method: 'PUT', body: JSON.stringify(sections) }),
  saveSettings: (settings: SiteSettings) => request<SiteSettings>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getAbout: () => request<AboutPageContent | null>('/api/admin/about'),
  saveAbout: (content: AboutPageContent) => request<AboutPageContent>('/api/admin/about', { method: 'PUT', body: JSON.stringify(content) }),
  listColors: () => request<ColorOption[]>('/api/admin/colors'),
  createColor: (name: string, hex: string) =>
    request<ColorOption>('/api/admin/colors', { method: 'POST', body: JSON.stringify({ name, hex }) }),
  updateColor: (id: string, name: string, hex: string) =>
    request<ColorOption>(`/api/admin/colors/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ name, hex }) }),
  deleteColor: (id: string) => request<{ ok: boolean }>(`/api/admin/colors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listMedia: () => request<{ id: string; public_url: string; path: string; created_at: string }[]>('/api/admin/media'),
  deleteMedia: (id: string) => request<{ ok: boolean }>(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  uploadImage: (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        void request<{ url: string }>('/api/admin/upload-image', {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name, dataUrl: reader.result as string }),
        }).then((r) => resolve(r.url)).catch(reject)
      }
      reader.onerror = () => reject(new Error('Could not read the file.'))
      reader.readAsDataURL(file)
    }),
}

export const storefrontUrl = '/'

export const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const formatPrice = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
