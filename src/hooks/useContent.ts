import { useCallback, useEffect, useState } from 'react'
import { contentSource } from '../content'
import type { AboutPageContent, Article, CatalogStats, Category, ColorOption, HomeSection, Product, ProductQuery, SiteSettings } from '../types'

function useAsync<T>(loader: () => Promise<T>, deps: unknown[], initial: T, refetchOnFocus = false) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const run = useCallback(() => {
    setLoading(true)
    let active = true
    loader()
      .then((value) => active && setData(value))
      .catch((e) => active && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, deps)

  useEffect(() => run(), [run])

  useEffect(() => {
    if (!refetchOnFocus) return
    const onVis = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refetchOnFocus, run])

  return { data, loading, error, refetch: run }
}

export function useProducts(query: ProductQuery = {}) {
  const key = JSON.stringify(query)
  return useAsync(() => contentSource.listProducts(query), [key], { items: [] as Product[], total: 0 }, true)
}

export function useProduct(slug?: string) {
  return useAsync(() => (slug ? contentSource.getProduct(slug) : Promise.resolve(null)), [slug], null as Product | null, true)
}

export function useProductsByIds(ids: string[]) {
  const key = ids.join(',')
  return useAsync(() => contentSource.getProductsByIds(ids), [key], [] as Product[], true)
}

export function useCategories() {
  return useAsync(() => contentSource.getCategoryTree(), [], [] as Category[], true)
}

export function useColors() {
  return useAsync(() => contentSource.listColors(), [], [] as ColorOption[], true)
}

export function useCatalogStats() {
  return useAsync(() => contentSource.getCatalogStats(), [], { minPrice: 0, maxPrice: 0, materials: [] } as CatalogStats, true)
}

export function useArticles() {
  return useAsync(() => contentSource.listArticles(), [], { items: [] as Article[], total: 0 }, true)
}

export function useArticle(slug?: string) {
  return useAsync(() => (slug ? contentSource.getArticle(slug) : Promise.resolve(null)), [slug], null as Article | null, true)
}

export function useHomeSections() {
  return useAsync(() => contentSource.listSections('home'), [], [] as HomeSection[], true)
}

export function useSiteSettings() {
  return useAsync(() => contentSource.getSiteSettings(), [], null as SiteSettings | null, true)
}

export function useAboutPage() {
  return useAsync(() => contentSource.getAboutPage(), [], null as AboutPageContent | null, true)
}
