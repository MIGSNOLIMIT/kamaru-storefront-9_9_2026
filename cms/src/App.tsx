import { useState } from 'react'
import { NavLink, Navigate, Route, BrowserRouter, Routes, useLocation } from 'react-router-dom'
import { ExternalLink, Menu, X } from 'lucide-react'
import { storefrontUrl } from './api'
import { AboutPageEditor } from './pages/AboutPage'
import { ArticleEditor, ArticleList } from './pages/Articles'
import { CategoryEditor, CategoryList } from './pages/Categories'
import { ColorsPage } from './pages/Colors'
import { Dashboard } from './pages/Dashboard'
import { Inquiries } from './pages/Inquiries'
import { Login } from './pages/Login'
import { MediaPage } from './pages/Media'
import { ResetPassword } from './pages/ResetPassword'
import { Members } from './pages/Members'
import { Orders } from './pages/Orders'
import { ProductEditor, ProductList } from './pages/Products'
import { Sections } from './pages/Sections'
import { Settings } from './pages/Settings'
import { StaffAuthProvider, useStaffAuth } from './state/StaffAuth'
import { Button } from './ui'

const links = [
  ['Overview', '/'],
  ['Products', '/products'],
  ['Categories', '/categories'],
  ['Colors', '/colors'],
  ['Media', '/media'],
  ['Orders', '/orders'],
  ['Inquiries', '/inquiries'],
  ['Members', '/members'],
  ['Journal', '/articles'],
  ['Homepage', '/homepage'],
  ['About', '/about'],
  ['Settings', '/settings'],
] as const

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {links.map(([label, to]) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `block px-3 py-2.5 text-xs font-bold tracking-[.14em] ${isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'}`
          }
        >
          {label.toUpperCase()}
        </NavLink>
      ))}
    </>
  )
}

function Shell() {
  const { staff, logout } = useStaffAuth()
  const { pathname } = useLocation()
  const [mobileNav, setMobileNav] = useState(false)
  if (pathname === '/reset-password') return <ResetPassword />
  if (!staff) return <Login />

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden bg-ink text-white lg:block">
        <div className="sticky top-0 p-6">
          <p className="font-display text-xl font-extrabold tracking-[.18em]">KAMARU</p>
          <p className="mt-1 text-[10px] font-bold tracking-[.22em] text-khaki">CUSTOM CMS</p>
          <p className="mt-3 text-xs text-white/50">{staff.fullName}</p>
          <p className="text-[10px] font-bold tracking-widest text-khaki">{staff.role === 'super_admin' ? 'SUPER ADMIN' : 'EDITOR'}</p>
          <nav className="mt-8 space-y-1">
            <NavLinks />
          </nav>
          <a href={storefrontUrl} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold tracking-[.16em] text-khaki hover:text-white">
            OPEN STOREFRONT <ExternalLink size={12} />
          </a>
          <Button type="button" variant="ghost" className="mt-6 text-white/60" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-ink/10 bg-bone px-4 py-3 lg:hidden">
          <button type="button" aria-label="Open menu" onClick={() => setMobileNav(true)}>
            <Menu />
          </button>
          <p className="text-xs font-bold tracking-widest">KAMARU CMS</p>
          <span className="w-6" />
        </div>
        {mobileNav && (
          <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileNav(false)}>
            <aside className="h-full w-[85%] max-w-xs bg-ink p-6 text-white" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex justify-end">
                <button type="button" aria-label="Close menu" onClick={() => setMobileNav(false)}>
                  <X />
                </button>
              </div>
              <nav className="space-y-1">
                <NavLinks onNavigate={() => setMobileNav(false)} />
              </nav>
              <Button type="button" variant="ghost" className="mt-6 text-white/60" onClick={logout}>
                Sign out
              </Button>
            </aside>
          </div>
        )}
        <div className="p-5 md:p-8">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="categories" element={<CategoryList />} />
            <Route path="categories/new" element={<CategoryEditor />} />
            <Route path="categories/:id" element={<CategoryEditor />} />
            <Route path="colors" element={<ColorsPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="orders" element={<Orders />} />
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="members" element={<Members />} />
            <Route path="articles" element={<ArticleList />} />
            <Route path="articles/new" element={<ArticleEditor />} />
            <Route path="articles/:id" element={<ArticleEditor />} />
            <Route path="homepage" element={<Sections />} />
            <Route path="about" element={<AboutPageEditor />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/cms">
      <StaffAuthProvider>
        <Shell />
      </StaffAuthProvider>
    </BrowserRouter>
  )
}
