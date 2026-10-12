import { useEffect, useRef, useState } from 'react'
import { contentSource } from '../content'
import type { AboutPageContent, Article, CatalogStats, Category, ColorOption, HomeSection, Product, ProductQuery, SiteSettings } from '../types'

function useAsync<T>(loader: () => Promise<T>, depKey: string, initial: T, refetchOnFocus = false) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loaderRef.current()
      .then((value) => {
        if (cancelled) return
        setData(value)
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [depKey])

  useEffect(() => {
    if (!refetchOnFocus) return
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      let cancelled = false
      setLoading(true)
      void loaderRef.current()
        .then((value) => {
          if (cancelled) return
          setData(value)
          setError(null)
        })
        .catch((e) => {
          if (cancelled) return
          setError(e instanceof Error ? e : new Error(String(e)))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refetchOnFocus, depKey])

  const refetch = () => {
    setLoading(true)
    void loaderRef.current()
      .then((value) => {
        setData(value)
        setError(null)
      })
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false))
  }

  return { data, loading, error, refetch }
}

export function useProducts(query: ProductQuery = {}) {
  const key = JSON.stringify(query)
  return useAsync(() => contentSource.listProducts(query), key, { items: [] as Product[], total: 0 }, true)
}

export function useProduct(slug?: string) {
  return useAsync(() => (slug ? contentSource.getProduct(slug) : Promise.resolve(null)), slug ?? '', null as Product | null, true)
}

export function useProductsByIds(ids: string[]) {
  const key = ids.join(',')
  return useAsync(() => contentSource.getProductsByIds(ids), key, [] as Product[], true)
}

export function useCategories() {
  return useAsync(() => contentSource.getCategoryTree(), 'categories', [] as Category[], true)
}

export function useColors() {
  return useAsync(() => contentSource.listColors(), 'colors', [] as ColorOption[], true)
}

export function useCatalogStats() {
  return useAsync(() => contentSource.getCatalogStats(), 'catalog-stats', { minPrice: 0, maxPrice: 0, materials: [] } as CatalogStats, true)
}

export function useArticles() {
  return useAsync(() => contentSource.listArticles(), 'articles', { items: [] as Article[], total: 0 }, true)
}

export function useArticle(slug?: string) {
  return useAsync(() => (slug ? contentSource.getArticle(slug) : Promise.resolve(null)), slug ?? '', null as Article | null, true)
}

export function useHomeSections() {
  return useAsync(() => contentSource.listSections('home'), 'home-sections', [] as HomeSection[], true)
}

export function useSiteSettings() {
  return useAsync(() => contentSource.getSiteSettings(), 'site-settings', null as SiteSettings | null, true)
}

export function useAboutPage() {
  return useAsync(() => contentSource.getAboutPage(), 'about-page', null as AboutPageContent | null, true)
}
