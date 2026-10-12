import { useMemo } from 'react'
import { useProducts, useProductsByIds } from '../hooks/useContent'
import type { Product, ProductQuery } from '../types'

/** Picked product ids when set; otherwise products from the flag query. */
export function useHomeProductList(productIds: string[] | undefined, fallbackQuery: ProductQuery): Product[] {
  const ids = productIds?.filter(Boolean) ?? []
  const idKey = ids.join(',')
  const { data: picked } = useProductsByIds(ids)
  const { data: flagged } = useProducts(fallbackQuery)

  return useMemo(() => {
    if (ids.length) {
      const byId = new Map(picked.map((p) => [p.id, p]))
      return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p))
    }
    return flagged.items
  }, [idKey, picked, flagged.items])
}
