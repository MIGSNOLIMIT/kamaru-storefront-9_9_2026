import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { Product } from '../types'
import { contentSource } from '../content'
import { useAuth } from './AuthContext'

export interface CartLineRef {
  productId: string
  colorId: string
  quantity: number
}

export interface CartLine extends CartLineRef {
  product: Product
}

interface StoreValue {
  cart: CartLine[]
  wishlist: string[]
  cartOpen: boolean
  bulkLoginPrompt: boolean
  setBulkLoginPrompt: (open: boolean) => void
  setCartOpen: (open: boolean) => void
  addToCart: (product: Product, colorId?: string, quantity?: number) => void
  removeFromCart: (productId: string, colorId: string) => void
  updateQuantity: (productId: string, colorId: string, quantity: number) => void
  toggleWishlist: (id: string) => void
  clearCart: () => void
  cartCount: number
}

const StoreContext = createContext<StoreValue | null>(null)

type Action =
  | { type: 'add'; line: CartLineRef }
  | { type: 'remove'; productId: string; colorId: string }
  | { type: 'quantity'; productId: string; colorId: string; quantity: number }
  | { type: 'clear' }
  | { type: 'set'; lines: CartLineRef[] }

function reducer(state: CartLineRef[], action: Action): CartLineRef[] {
  if (action.type === 'clear') return []
  if (action.type === 'set') return action.lines
  if (action.type === 'add') {
    const index = state.findIndex((l) => l.productId === action.line.productId && l.colorId === action.line.colorId)
    if (index < 0) return [...state, action.line]
    return state.map((l, i) =>
      i === index ? { ...l, quantity: l.quantity + action.line.quantity } : l,
    )
  }
  if (action.type === 'remove') return state.filter((l) => l.productId !== action.productId || l.colorId !== action.colorId)
  return state.map((l) =>
    l.productId === action.productId && l.colorId === action.colorId
      ? { ...l, quantity: Math.max(1, action.quantity) }
      : l,
  )
}

function load<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved).data ?? fallback : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [lineRefs, dispatch] = useReducer(reducer, [], () => load<CartLineRef[]>('kamaru-cart-v2', []))
  const [productMap, setProductMap] = useState<Record<string, Product>>({})
  const [wishlist, setWishlist] = useState<string[]>(() => load('kamaru-wishlist-v1', []))
  const [cartOpen, setCartOpen] = useState(false)
  const [bulkLoginPrompt, setBulkLoginPrompt] = useState(false)

  useEffect(() => {
    localStorage.setItem('kamaru-cart-v2', JSON.stringify({ version: 2, data: lineRefs }))
  }, [lineRefs])

  useEffect(() => {
    localStorage.setItem('kamaru-wishlist-v1', JSON.stringify({ version: 1, data: wishlist }))
  }, [wishlist])

  useEffect(() => {
    const ids = [...new Set(lineRefs.map((l) => l.productId))]
    if (!ids.length) {
      setProductMap({})
      return
    }
    void contentSource.getProductsByIds(ids).then((products) => {
      const map = Object.fromEntries(products.map((p) => [p.id, p]))
      setProductMap(map)
      const valid = lineRefs.filter((l) => map[l.productId])
      if (valid.length !== lineRefs.length) dispatch({ type: 'set', lines: valid })
    })
  }, [lineRefs])

  const cart: CartLine[] = lineRefs
    .map((line) => {
      const product = productMap[line.productId]
      return product ? { ...line, product } : null
    })
    .filter(Boolean) as CartLine[]

  const value = useMemo<StoreValue>(
    () => ({
      cart,
      wishlist,
      cartOpen,
      bulkLoginPrompt,
      setBulkLoginPrompt,
      setCartOpen,
      addToCart: (product, colorId = product.colors[0]?.id ?? 'default', quantity = 1) => {
        if (!isAuthenticated) {
          setBulkLoginPrompt(true)
          return
        }
        dispatch({ type: 'add', line: { productId: product.id, colorId, quantity } })
        setCartOpen(true)
      },
      removeFromCart: (productId, colorId) => dispatch({ type: 'remove', productId, colorId }),
      updateQuantity: (productId, colorId, quantity) => dispatch({ type: 'quantity', productId, colorId, quantity }),
      toggleWishlist: (id) => setWishlist((items) => (items.includes(id) ? items.filter((x) => x !== id) : [...items, id])),
      clearCart: () => dispatch({ type: 'clear' }),
      cartCount: lineRefs.reduce((sum, l) => sum + l.quantity, 0),
    }),
    [cart, wishlist, cartOpen, bulkLoginPrompt, isAuthenticated, lineRefs],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside StoreProvider')
  return value
}
