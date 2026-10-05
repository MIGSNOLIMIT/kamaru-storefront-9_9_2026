import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Seo } from './components/Seo'
import { GaInit } from './components/GaInit'
import { AuthProvider } from './state/AuthContext'
import { LanguageProvider } from './state/LanguageContext'
import { StoreProvider } from './state/StoreContext'

const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const Checkout = lazy(() => import('./pages/Checkout'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const content = import('./pages/ContentPages')
const legal = import('./pages/LegalPages')
const About = lazy(() => content.then(m => ({ default: m.About })))
const Blog = lazy(() => content.then(m => ({ default: m.Blog })))
const ArticlePage = lazy(() => content.then(m => ({ default: m.ArticlePage })))
const Contact = lazy(() => content.then(m => ({ default: m.Contact })))
const Cart = lazy(() => content.then(m => ({ default: m.Cart })))
const Wishlist = lazy(() => content.then(m => ({ default: m.Wishlist })))
const Account = lazy(() => content.then(m => ({ default: m.Account })))
const NotFound = lazy(() => content.then(m => ({ default: m.NotFound })))
const Privacy = lazy(() => legal.then(m => ({ default: m.Privacy })))
const Terms = lazy(() => legal.then(m => ({ default: m.Terms })))

function ScrollManager() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return (
    <>
      <Seo />
      <GaInit />
    </>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-xs font-bold tracking-[.2em]">LOADING KAMARU</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="category/:slug" element={<Shop />} />
          <Route path="product/:slug" element={<ProductPage />} />
          <Route path="about" element={<About />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<ArticlePage />} />
          <Route path="contact" element={<Contact />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="account" element={<Account />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="privacy-policy" element={<Privacy />} />
          <Route path="terms-and-conditions" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <StoreProvider>
            <ScrollManager />
            <AppRoutes />
          </StoreProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
