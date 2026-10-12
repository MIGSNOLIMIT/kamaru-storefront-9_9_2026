import { useEffect, useState } from 'react'
import { contentSource } from '../content'
import type { Article, Category, ColorOption, HomeSection, Product, ProductQuery, SiteSettings } from '../types'

function useAsync<T>(loader: () => Promise<T>, deps: unknown[], initial: T) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    let active = true
    setLoading(true)
    loader().then((value) => active && setData(value)).catch((e) => active && setError(e)).finally(() => active && setLoading(false))
    return () => { active = false }
    // loader is intentionally recreated by consumers and controlled through deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading, error }
}

export function useProducts(query: ProductQuery = {}) {
  const key = JSON.stringify(query)
  return useAsync(() => contentSource.listProducts(query), [key], { items: [] as Product[], total: 0 })
}

export function useProduct(slug?: string) {
  return useAsync(() => slug ? contentSource.getProduct(slug) : Promise.resolve(null), [slug], null as Product | null)
}

export function useCategories() {
  return useAsync(() => contentSource.getCategoryTree(), [], [] as Category[])
}

export function useColors() {
  return useAsync(() => contentSource.listColors(), [], [] as ColorOption[])
}

export function useArticles() {
  return useAsync(() => contentSource.listArticles(), [], { items: [] as Article[], total: 0 })
}

export function useArticle(slug?: string) {
  return useAsync(() => slug ? contentSource.getArticle(slug) : Promise.resolve(null), [slug], null as Article | null)
}

export function useHomeSections() {
  return useAsync(() => contentSource.listSections('home'), [], [] as HomeSection[])
}

export function useSiteSettings() {
  return useAsync(() => contentSource.getSiteSettings(), [], null as SiteSettings | null)
}
