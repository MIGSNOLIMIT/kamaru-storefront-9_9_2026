import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Heart, Menu, Minus, Plus, Search, ShoppingBag, User, X } from 'lucide-react'
import { contentSource } from '../content'
import { useCategories, useSiteSettings } from '../hooks/useContent'
import { useStore } from '../state/StoreContext'
import { useLanguage } from '../state/LanguageContext'
import { Button, Media, Modal } from './UI'
import { formatPrice } from './Product'
import { colorOf, imageForColor } from '../lib/product-color'

const navKeys = [
  ['home', '/'],
  ['shop', '/shop'],
  ['about', '/about'],
  ['blog', '/blog'],
  ['contact', '/contact'],
] as const

const RECENT_KEY = 'kamaru-recent-searches'

function saveRecent(term: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    const next = [term, ...list.filter((x) => x !== term)].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

const defaultLogo = '/kamaru-logo.png'

export function Logo({ light = false, src }: { light?: boolean; src?: string }) {
  return (
    <Link to="/" className="inline-flex items-center" aria-label="KAMARU home">
      <img
        src={src || defaultLogo}
        alt="KAMARU"
        className={`h-11 w-auto max-w-[42vw] object-contain sm:h-12 sm:max-w-[220px] md:h-14 md:max-w-[260px] ${light ? 'bg-white px-2 py-1' : ''}`}
      />
    </Link>
  )
}

function SearchOverlay({ open, close }: { open: boolean; close: () => void }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<{ name: string; slug: string }[]>([])
  const [recent, setRecent] = useState<string[]>(() => loadRecent())
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    setRecent(loadRecent())
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    const t = setTimeout(() => {
      void contentSource.listProducts({ search: query.trim(), limit: 5 }).then((r) =>
        setSuggestions(r.items.map((p) => ({ name: p.name, slug: p.slug }))),
      )
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const go = (term: string) => {
    saveRecent(term)
    navigate(`/shop?search=${encodeURIComponent(term)}`)
    close()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) go(query.trim())
  }

  return (
    <Modal open={open} onClose={close} title="Search Kamaru">
      <form onSubmit={submit} className="py-8">
        <p className="mb-4 text-xs font-bold tracking-[.2em] text-clay">SEARCH THE CATALOG</p>
        <label htmlFor="site-search" className="sr-only">
          Search products
        </label>
        <div className="flex border-b-2 border-ink">
          <input
            id="site-search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="min-w-0 flex-1 bg-transparent py-4 text-2xl outline-none placeholder:text-ink/25"
          />
          <button type="submit" className="px-4" aria-label="Submit search">
            <Search />
          </button>
        </div>
        {suggestions.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {suggestions.map((s) => (
              <li key={s.slug}>
                <button type="button" className="w-full text-left hover:text-clay" onClick={() => go(s.name)}>
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!query && recent.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-bold tracking-widest text-ink/40">RECENT</p>
            <ul className="mt-2 space-y-2 text-sm">
              {recent.map((r) => (
                <li key={r}>
                  <button type="button" className="hover:text-clay" onClick={() => go(r)}>
                    {r}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </Modal>
  )
}

function useFocusTrap(active: boolean, onEscape: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!active) return
    const previous = document.activeElement as HTMLElement
    ref.current?.focus()
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape()
      if (event.key === 'Tab' && ref.current) {
        const nodes = [...ref.current.querySelectorAll<HTMLElement>('button,a,input,select,[tabindex]:not([tabindex="-1"])')]
        if (!nodes.length) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      previous?.focus()
    }
  }, [active, onEscape])
  return ref
}

function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQuantity, cartCount } = useStore()
  const subtotal = cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  const close = () => setCartOpen(false)
  const trapRef = useFocusTrap(cartOpen, close)

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [cartOpen])

  if (!cartOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside
        ref={trapRef}
        tabIndex={-1}
        aria-label="Shopping cart"
        role="dialog"
        aria-modal="true"
        className="ml-auto flex h-full w-full max-w-md flex-col bg-bone p-6 shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-ink/15 pb-5">
          <h2 className="text-xl font-extrabold">
            YOUR CART <span className="text-sm text-ink/50">({cartCount})</span>
          </h2>
          <button type="button" onClick={close} aria-label="Close cart" className="grid size-11 place-items-center">
            <X />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-auto py-5">
          {cart.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <ShoppingBag className="mx-auto mb-4 text-ink/30" size={42} />
                <p>Your cart is ready for adventure.</p>
              </div>
            </div>
          ) : (
            cart.map((line) => {
              const color = colorOf(line.product, line.colorId)
              return (
              <div key={`${line.product.id}-${line.colorId}`} className="flex gap-4">
                <div className="h-24 w-20 shrink-0">
                  <Media image={imageForColor(line.product, line.colorId)} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">{line.product.name}</h3>
                  {color && <p className="text-xs text-ink/55">{color.name}{color.description ? ` · ${color.description}` : ''}</p>}
                  <div className="mt-2 inline-flex items-center border border-ink/15">
                    <button type="button" aria-label="Decrease" className="p-2" onClick={() => updateQuantity(line.product.id, line.colorId, line.quantity - 1)}>
                      <Minus size={14} />
                    </button>
                    <span className="px-2 text-sm">{line.quantity}</span>
                    <button type="button" aria-label="Increase" className="p-2" onClick={() => updateQuantity(line.product.id, line.colorId, line.quantity + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{formatPrice(line.product.price * line.quantity)}</p>
                  <button type="button" onClick={() => removeFromCart(line.product.id, line.colorId)} className="mt-1 text-xs underline">
                    Remove
                  </button>
                </div>
              </div>
              )
            })
          )}
        </div>
        <div className="border-t border-ink/15 pt-5">
          <div className="mb-4 flex justify-between font-bold">
            <span>SUBTOTAL</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <Link onClick={close} to="/cart">
            <Button className="w-full">View cart</Button>
          </Link>
        </div>
      </aside>
    </div>
  )
}

function BulkLoginPrompt() {
  const { bulkLoginPrompt, setBulkLoginPrompt } = useStore()
  const { tr } = useLanguage()
  const navigate = useNavigate()
  if (!bulkLoginPrompt) return null
  return (
    <Modal open={bulkLoginPrompt} onClose={() => setBulkLoginPrompt(false)} title="Bulk orders vs retail">
      <div className="space-y-4 py-4 text-sm leading-7 text-ink/70">
        <p>{tr('retailNote')}</p>
        <p>To add items to the bulk cart and checkout on this site, sign in or create a member account.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            onClick={() => {
              setBulkLoginPrompt(false)
              navigate(`/account?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
            }}
          >
            Sign in for bulk
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setBulkLoginPrompt(false)}>
            Continue browsing
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function Header() {
  const [menu, setMenu] = useState(false)
  const [search, setSearch] = useState(false)
  const [mega, setMega] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { data: categories } = useCategories()
  const { data: settings } = useSiteSettings()
  const { cartCount, wishlist, setCartOpen } = useStore()
  const { tr, locale, setLocale } = useLanguage()

  useEffect(() => {
    const h = () => setScrolled(scrollY > 12)
    addEventListener('scroll', h, { passive: true })
    return () => removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    if (!mega) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMega(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mega])

  const roots = categories.filter((c) => !c.parentId)
  const catLink = (slug: string) => `/shop?category=${encodeURIComponent(slug)}`

  return (
    <>
      <header className={`sticky top-0 z-50 bg-bone/95 backdrop-blur-sm transition-shadow ${scrolled ? 'shadow-md' : 'border-b border-ink/10'}`}>
        <div className="container-site flex h-20 items-center justify-between">
          <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" className="grid size-11 place-items-center lg:hidden">
            <Menu />
          </button>
          <Logo src={settings?.headerLogoUrl} />
          <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
            {navKeys.slice(0, 3).map(([key, to]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `text-xs font-bold tracking-[.12em] ${isActive ? 'text-clay' : 'hover:text-clay'}`}>
                {tr(key)}
              </NavLink>
            ))}
            <div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
              <button type="button" onClick={() => setMega(!mega)} className="h-20 text-xs font-bold tracking-[.12em]" aria-expanded={mega}>
                CATEGORIES
              </button>
              {mega && (
                <div className="fixed left-0 right-0 top-20 border-t border-ink/10 bg-bone p-8 shadow-xl">
                  <div className="container-site grid grid-cols-3 gap-4 md:grid-cols-5">
                    {roots.map((root) => (
                      <Link key={root.id} onClick={() => setMega(false)} to={catLink(root.slug)} className="font-display text-sm font-bold hover:text-clay">
                        {root.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {navKeys.slice(3).map(([key, to]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `text-xs font-bold tracking-[.12em] ${isActive ? 'text-clay' : 'hover:text-clay'}`}>
                {tr(key)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center">
            <button type="button" aria-label="Toggle language" className="mr-1 hidden min-h-10 px-2 text-[10px] font-bold tracking-widest sm:block" onClick={() => setLocale(locale === 'en' ? 'tl' : 'en')}>
              {locale === 'en' ? 'TL' : 'EN'}
            </button>
            <button type="button" onClick={() => setSearch(true)} aria-label="Search" className="grid size-10 place-items-center">
              <Search size={19} />
            </button>
            <Link to="/account" aria-label="Account" className="hidden size-10 place-items-center sm:grid">
              <User size={19} />
            </Link>
            <Link to="/wishlist" aria-label={`Wishlist with ${wishlist.length} items`} className="relative hidden size-10 place-items-center sm:grid">
              <Heart size={19} />
              {wishlist.length > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-clay text-[9px] text-white">{wishlist.length}</span>}
            </Link>
            <button type="button" onClick={() => setCartOpen(true)} aria-label={`Cart with ${cartCount} items`} className="relative grid size-10 place-items-center">
              <ShoppingBag size={19} />
              {cartCount > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-clay text-[9px] text-white">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
      {menu && (
        <div className="fixed inset-0 z-[90] bg-black/50">
          <div className="h-full w-[88%] max-w-sm overflow-auto bg-bone p-6">
            <div className="mb-10 flex justify-between">
              <Logo src={settings?.headerLogoUrl} />
              <button type="button" onClick={() => setMenu(false)} aria-label="Close menu">
                <X />
              </button>
            </div>
            <nav className="space-y-2">
              {navKeys.map(([key, to]) => (
                <Link onClick={() => setMenu(false)} key={to} to={to} className="block border-b border-ink/10 py-4 font-display font-bold">
                  {tr(key)}
                </Link>
              ))}
              <p className="pt-5 text-xs font-bold tracking-widest text-clay">CATEGORIES</p>
              {roots.map((r) => (
                <Link onClick={() => setMenu(false)} key={r.id} to={catLink(r.slug)} className="block py-2 text-sm">
                  {r.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
      <SearchOverlay open={search} close={() => setSearch(false)} />
      <CartDrawer />
      <BulkLoginPrompt />
    </>
  )
}

export function Footer() {
  const { data: settings } = useSiteSettings()
  const { data: categories } = useCategories()
  const shopRoots = categories.filter((c) => !c.parentId).slice(0, 6)
  const footerLinks: Record<string, string> = {
    'All Products': '/shop',
    'About Kamaru': '/about',
    Blog: '/blog',
    'Contact Us': '/contact',
    'My Account': '/account',
    Cart: '/cart',
    Wishlist: '/wishlist',
    'Privacy Policy': '/privacy-policy',
    'Terms & Conditions': '/terms-and-conditions',
  }
  const shopItems = ['All Products', ...shopRoots.map((c) => c.name)]
  const shopUrls: Record<string, string> = {
    'All Products': '/shop',
    ...Object.fromEntries(shopRoots.map((c) => [c.name, `/shop?category=${encodeURIComponent(c.slug)}`])),
  }

  return (
    <footer className="bg-ink text-white">
      <div className="container-site grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light src={settings?.footerLogoUrl} />
          <p className="mt-5 max-w-xs text-sm leading-7 text-white/60">Durable bags made for everyday life, travel and adventure.</p>
          <div className="mt-5 flex gap-4 text-xs font-bold tracking-widest">
            <a href={settings?.social[0]?.href} className="hover:text-khaki">
              FACEBOOK
            </a>
            <a href={settings?.social[1]?.href} className="hover:text-khaki">
              INSTAGRAM
            </a>
          </div>
        </div>
        {[
          ['SHOP', shopItems],
          ['ABOUT', ['About Kamaru', 'Blog', 'Contact Us']],
          ['CUSTOMER SERVICE', ['My Account', 'Cart', 'Wishlist', 'Privacy Policy', 'Terms & Conditions']],
        ].map(([title, items]) => (
          <div key={title as string}>
            <h3 className="text-xs font-bold tracking-[.2em] text-khaki">{title}</h3>
            <ul className="mt-5 space-y-3 text-sm text-white/65">
              {(items as string[]).map((item) => (
                <li key={item}>
                  <Link className="hover:text-white" to={shopUrls[item] ?? footerLinks[item] ?? '/shop'}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-3 py-6 text-xs text-white/45 md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} KAMARU Philippines</span>
          <span>{settings?.address}</span>
          <span>{settings?.email}</span>
        </div>
      </div>
    </footer>
  )
}

export function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
