import { NavLink, Navigate, Route, BrowserRouter, Routes, useLocation } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { storefrontUrl } from './api'
import { ArticleEditor, ArticleList } from './pages/Articles'
import { CategoryEditor, CategoryList } from './pages/Categories'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
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
  ['Orders', '/orders'],
  ['Members', '/members'],
  ['Journal', '/articles'],
  ['Homepage', '/homepage'],
  ['Settings', '/settings'],
] as const

function Shell() {
  const { staff, logout } = useStaffAuth()
  const { pathname } = useLocation()
  if (pathname === '/reset-password') return <ResetPassword />
  if (!staff) return <Login />

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-ink text-white">
        <div className="sticky top-0 p-6">
          <p className="font-display text-xl font-extrabold tracking-[.18em]">KAMARU</p>
          <p className="mt-1 text-[10px] font-bold tracking-[.22em] text-khaki">CUSTOM CMS</p>
          <p className="mt-3 text-xs text-white/50">{staff.fullName}</p>
          <nav className="mt-8 space-y-1">
            {links.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `block px-3 py-2.5 text-xs font-bold tracking-[.14em] ${isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'}`}
              >
                {label.toUpperCase()}
              </NavLink>
            ))}
          </nav>
          <a href={storefrontUrl} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold tracking-[.16em] text-khaki hover:text-white">
            OPEN STOREFRONT <ExternalLink size={12} />
          </a>
          <Button type="button" variant="ghost" className="mt-6 text-white/60" onClick={logout}>Sign out</Button>
        </div>
      </aside>
      <div className="min-w-0 p-5 md:p-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductEditor />} />
          <Route path="products/:id" element={<ProductEditor />} />
          <Route path="categories" element={<CategoryList />} />
          <Route path="categories/new" element={<CategoryEditor />} />
          <Route path="categories/:id" element={<CategoryEditor />} />
          <Route path="orders" element={<Orders />} />
          <Route path="members" element={<Members />} />
          <Route path="articles" element={<ArticleList />} />
          <Route path="articles/new" element={<ArticleEditor />} />
          <Route path="articles/:id" element={<ArticleEditor />} />
          <Route path="homepage" element={<Sections />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
