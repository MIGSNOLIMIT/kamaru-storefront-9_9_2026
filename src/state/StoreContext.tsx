import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Product } from '../types'
import { useAuth } from './AuthContext'

export interface CartLine { product: Product; colorId: string; quantity: number }
interface StoreValue {
  cart: CartLine[]
  wishlist: string[]
  cartOpen: boolean
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
  | { type: 'add'; product: Product; colorId: string; quantity: number }
  | { type: 'remove'; productId: string; colorId: string }
  | { type: 'quantity'; productId: string; colorId: string; quantity: number }
  | { type: 'clear' }

function reducer(state: CartLine[], action: Action): CartLine[] {
  if (action.type === 'clear') return []
  if (action.type === 'add') {
    const index = state.findIndex((l) => l.product.id === action.product.id && l.colorId === action.colorId)
    if (index < 0) return [...state, { product: action.product, colorId: action.colorId, quantity: action.quantity }]
    return state.map((l, i) => i === index ? { ...l, quantity: l.quantity + action.quantity } : l)
  }
  if (action.type === 'remove') return state.filter((l) => l.product.id !== action.productId || l.colorId !== action.colorId)
  return state.map((l) => l.product.id === action.productId && l.colorId === action.colorId ? { ...l, quantity: Math.max(1, action.quantity) } : l)
}

function load<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved).data ?? fallback : fallback
  } catch { return fallback }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [cart, dispatch] = useReducer(reducer, [], () => load('kamaru-cart-v1', []))
  const [wishlist, setWishlist] = useState<string[]>(() => load('kamaru-wishlist-v1', []))
  const [cartOpen, setCartOpen] = useState(false)
  useEffect(() => localStorage.setItem('kamaru-cart-v1', JSON.stringify({ version: 1, data: cart })), [cart])
  useEffect(() => localStorage.setItem('kamaru-wishlist-v1', JSON.stringify({ version: 1, data: wishlist })), [wishlist])

  const requireAuthForBulk = () => {
    const next = `${location.pathname}${location.search}`
    navigate(`/account?next=${encodeURIComponent(next)}`)
  }

  const value = useMemo<StoreValue>(() => ({
    cart, wishlist, cartOpen, setCartOpen,
    addToCart: (product, colorId = product.colors[0]?.id ?? 'default', quantity = 1) => {
      if (!isAuthenticated) {
        requireAuthForBulk()
        return
      }
      dispatch({ type: 'add', product, colorId, quantity })
      setCartOpen(true)
    },
    removeFromCart: (productId, colorId) => dispatch({ type: 'remove', productId, colorId }),
    updateQuantity: (productId, colorId, quantity) => dispatch({ type: 'quantity', productId, colorId, quantity }),
    toggleWishlist: (id) => setWishlist((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]),
    clearCart: () => dispatch({ type: 'clear' }),
    cartCount: cart.reduce((sum, l) => sum + l.quantity, 0),
  }), [cart, wishlist, cartOpen, isAuthenticated, location.pathname, location.search, navigate])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside StoreProvider')
  return value
}
