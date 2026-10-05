import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useCategories, useSiteSettings } from '../hooks/useContent'
import { useStore } from '../state/StoreContext'
import { useLanguage } from '../state/LanguageContext'
import { Button, Media, Modal } from './UI'
import { formatPrice } from './Product'

const navKeys = [
  ['home', '/'],
  ['shop', '/shop'],
  ['about', '/about'],
  ['blog', '/blog'],
  ['contact', '/contact'],
] as const

export function Logo({ light = false }: { light?: boolean }) {
  return <Link to="/" className={`font-display text-2xl font-extrabold tracking-[.2em] ${light ? 'text-white' : 'text-ink'}`}>KAMARU</Link>
}

function SearchOverlay({ open, close }: { open: boolean; close: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (query.trim()) { navigate(`/shop?search=${encodeURIComponent(query)}`); close() } }
  return <Modal open={open} onClose={close} title="Search Kamaru"><form onSubmit={submit} className="py-12"><p className="mb-4 text-xs font-bold tracking-[.2em] text-clay">SEARCH THE CATALOG</p><label htmlFor="site-search" className="sr-only">Search products</label><div className="flex border-b-2 border-ink"><input id="site-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What are you looking for?" className="min-w-0 flex-1 bg-transparent py-4 text-2xl outline-none placeholder:text-ink/25" /><button className="px-4" aria-label="Submit search"><Search /></button></div><p className="mt-4 text-sm text-ink/50">Try “travel”, “backpack”, or “water resistant”.</p></form></Modal>
}

function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, cartCount } = useStore()
  const subtotal = cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  useEffect(() => { document.body.style.overflow = cartOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [cartOpen])
  if (!cartOpen) return null
  return <div className="fixed inset-0 z-[100] bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}><aside aria-label="Shopping cart" className="ml-auto flex h-full w-full max-w-md flex-col bg-bone p-6 shadow-2xl"><div className="flex items-center justify-between border-b border-ink/15 pb-5"><h2 className="text-xl font-extrabold">YOUR CART <span className="text-sm text-ink/50">({cartCount})</span></h2><button onClick={() => setCartOpen(false)} aria-label="Close cart" className="grid size-11 place-items-center"><X /></button></div><div className="flex-1 space-y-5 overflow-auto py-5">{cart.length === 0 ? <div className="grid h-full place-items-center text-center"><div><ShoppingBag className="mx-auto mb-4 text-ink/30" size={42}/><p>Your cart is ready for adventure.</p></div></div> : cart.map((line) => <div key={`${line.product.id}-${line.colorId}`} className="flex gap-4"><div className="h-24 w-20 shrink-0"><Media image={line.product.images[0]} /></div><div className="min-w-0 flex-1"><h3 className="font-bold">{line.product.name}</h3><p className="text-xs text-ink/50">Qty {line.quantity}</p><p className="mt-2 text-sm font-semibold">{formatPrice(line.product.price * line.quantity)}</p><button onClick={() => removeFromCart(line.product.id,line.colorId)} className="mt-1 text-xs underline">Remove</button></div></div>)}</div><div className="border-t border-ink/15 pt-5"><div className="mb-4 flex justify-between font-bold"><span>SUBTOTAL</span><span>{formatPrice(subtotal)}</span></div><Link onClick={() => setCartOpen(false)} to="/cart"><Button className="w-full">View cart</Button></Link></div></aside></div>
}

export function Header() {
  const [menu, setMenu] = useState(false), [search, setSearch] = useState(false), [mega, setMega] = useState(false), [scrolled, setScrolled] = useState(false)
  const { data: categories } = useCategories()
  const { cartCount, wishlist, setCartOpen } = useStore()
  const { tr, locale, setLocale } = useLanguage()
  useEffect(() => { const h = () => setScrolled(scrollY > 12); addEventListener('scroll',h,{passive:true}); return () => removeEventListener('scroll',h) }, [])
  const roots = categories
  return <>
    <header className={`sticky top-0 z-50 bg-bone/95 backdrop-blur-sm transition-shadow ${scrolled ? 'shadow-md' : 'border-b border-ink/10'}`}>
      <div className="container-site flex h-20 items-center justify-between">
        <button onClick={() => setMenu(true)} aria-label="Open menu" className="grid size-11 place-items-center lg:hidden"><Menu /></button>
        <Logo />
        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">{navKeys.slice(0,3).map(([key,to]) => <NavLink key={to} to={to} className={({isActive}) => `text-xs font-bold tracking-[.12em] ${isActive ? 'text-clay' : 'hover:text-clay'}`}>{tr(key)}</NavLink>)}<div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}><button type="button" onClick={() => setMega(!mega)} className="h-20 text-xs font-bold tracking-[.12em]" aria-expanded={mega}>CATEGORIES</button>{mega && <div className="fixed left-0 right-0 top-20 border-t border-ink/10 bg-bone p-8 shadow-xl"><div className="container-site grid grid-cols-3 gap-4 md:grid-cols-5">{roots.map((root) => <Link key={root.id} onClick={() => setMega(false)} to={`/category/${root.slug}`} className="font-display text-sm font-bold hover:text-clay">{root.name}</Link>)}</div></div>}</div>{navKeys.slice(3).map(([key,to]) => <NavLink key={to} to={to} className={({isActive}) => `text-xs font-bold tracking-[.12em] ${isActive ? 'text-clay' : 'hover:text-clay'}`}>{tr(key)}</NavLink>)}</nav>
        <div className="flex items-center">
          <button type="button" aria-label="Toggle language" className="mr-1 hidden min-h-10 px-2 text-[10px] font-bold tracking-widest sm:block" onClick={() => setLocale(locale === 'en' ? 'tl' : 'en')}>{locale === 'en' ? 'TL' : 'EN'}</button>
          <button onClick={() => setSearch(true)} aria-label="Search" className="grid size-10 place-items-center"><Search size={19}/></button><Link to="/account" aria-label="Account" className="hidden size-10 place-items-center sm:grid"><User size={19}/></Link><Link to="/wishlist" aria-label={`Wishlist with ${wishlist.length} items`} className="relative hidden size-10 place-items-center sm:grid"><Heart size={19}/>{wishlist.length > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-clay text-[9px] text-white">{wishlist.length}</span>}</Link><button onClick={() => setCartOpen(true)} aria-label={`Cart with ${cartCount} items`} className="relative grid size-10 place-items-center"><ShoppingBag size={19}/>{cartCount > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-clay text-[9px] text-white">{cartCount}</span>}</button></div>
      </div>
    </header>
    {menu && <div className="fixed inset-0 z-[90] bg-black/50"><div className="h-full w-[88%] max-w-sm overflow-auto bg-bone p-6"><div className="mb-10 flex justify-between"><Logo/><button onClick={() => setMenu(false)} aria-label="Close menu"><X/></button></div><nav className="space-y-2">{navKeys.map(([key,to]) => <Link onClick={() => setMenu(false)} key={to} to={to} className="block border-b border-ink/10 py-4 font-display font-bold">{tr(key)}</Link>)}<p className="pt-5 text-xs font-bold tracking-widest text-clay">CATEGORIES</p>{roots.map((r) => <Link onClick={() => setMenu(false)} key={r.id} to={`/category/${r.slug}`} className="block py-2 text-sm">{r.name}</Link>)}</nav></div></div>}
    <SearchOverlay open={search} close={() => setSearch(false)} /><CartDrawer/>
  </>
}

export function Footer() {
  const { data: settings } = useSiteSettings()
  const footerLinks: Record<string, string> = {
    'All Products': '/shop',
    'About Kamaru': '/about',
    'Blog': '/blog',
    'Contact Us': '/contact',
    'My Account': '/account',
    'Cart': '/cart',
    'Wishlist': '/wishlist',
    'Privacy Policy': '/privacy-policy',
    'Terms & Conditions': '/terms-and-conditions',
  }
  return <footer className="bg-ink text-white"><div className="container-site grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-4"><div><Logo light/><p className="mt-5 max-w-xs text-sm leading-7 text-white/60">Durable bags made for everyday life, travel and adventure.</p><div className="mt-5 flex gap-4 text-xs font-bold tracking-widest"><a href={settings?.social[0]?.href} className="hover:text-khaki">FACEBOOK</a><a href={settings?.social[1]?.href} className="hover:text-khaki">INSTAGRAM</a></div></div>{[['SHOP',['All Products','Back Pack','Travelling Bag','Shoulder Bag','Daypack']],['ABOUT',['About Kamaru','Blog','Contact Us']],['CUSTOMER SERVICE',['My Account','Cart','Wishlist','Privacy Policy','Terms & Conditions']]].map(([title,items]) => <div key={title as string}><h3 className="text-xs font-bold tracking-[.2em] text-khaki">{title}</h3><ul className="mt-5 space-y-3 text-sm text-white/65">{(items as string[]).map((item) => <li key={item}><Link className="hover:text-white" to={footerLinks[item] ?? '/shop'}>{item}</Link></li>)}</ul></div>)}</div><div className="border-t border-white/10"><div className="container-site flex flex-col gap-3 py-6 text-xs text-white/45 md:flex-row md:justify-between"><span>© {new Date().getFullYear()} KAMARU Philippines</span><span>{settings?.address}</span><span>{settings?.email}</span></div></div></footer>
}

export function Layout() { return <><Header/><main><Outlet/></main><Footer/></> }
