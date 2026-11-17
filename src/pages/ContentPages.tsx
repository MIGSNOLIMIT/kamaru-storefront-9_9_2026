import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Mail, MapPin, Phone, Minus, Plus, Trash2 } from 'lucide-react'
import { Breadcrumbs, Button, Media, SectionHeading } from '../components/UI'
import { ProductGrid, formatPrice } from '../components/Product'
import { useAboutPage, useArticle, useArticles, useProducts, useSiteSettings } from '../hooks/useContent'
import { useStore } from '../state/StoreContext'
import { useAuth } from '../state/AuthContext'
import { useLanguage } from '../state/LanguageContext'
import { commerceApi } from '../lib/commerceApi'
import type { BulkOrder } from '../types'
import { Seo } from '../components/Seo'
import { colorOf, imageForColor } from '../lib/product-color'

const inputClass = 'min-h-12 w-full border border-ink/20 px-4 font-normal tracking-normal'

export function About() {
  const { data: page } = useAboutPage()
  const hero = page?.hero ?? { kicker: 'GAWANG PINOY. TIBAY PINOY.', title: 'ABOUT KAMARU', image: { id: 'about-hero', alt: 'About Kamaru', width: 1600, height: 900 } }
  const story = page?.story ?? { title: 'A FILIPINO STORY BUILT TO CARRY ON', paragraphs: ['Kamaru is a Filipino bag brand with roots dating back to 1988.'] }
  const vision = page?.vision ?? { title: 'World-class quality, proudly Filipino.', body: 'To be recognized as a highly respected marketing organization.' }
  const mission = page?.mission ?? { title: 'Committed to total customer satisfaction.', body: 'Through competent employees and values-oriented service.' }
  const values = page?.values.items ?? ['Commitment to Excellence', 'Integrity', 'Respect for Individual and Teamwork', 'Kaizen', 'Sense of Urgency and Determination']
  return (
    <>
      <section className="relative flex min-h-[450px] items-center bg-ink text-white">
        <div className="absolute inset-0 opacity-45"><Media image={hero.image} /></div>
        <div className="container-site relative z-10 text-center">
          <p className="text-xs font-bold tracking-[.25em] text-khaki">{hero.kicker}</p>
          <h1 className="mt-4 text-5xl font-extrabold md:text-8xl">{hero.title}</h1>
        </div>
      </section>
      <section className="section-space">
        <div className="container-site grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-clay">ROOTED IN 1988</p>
            <h2 className="mt-4 text-4xl font-extrabold md:text-6xl">{story.title}</h2>
          </div>
          <div className="space-y-5 leading-8 text-ink/65">
            {story.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-ink text-white section-space">
        <div className="container-site grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold tracking-widest text-khaki">OUR VISION</p>
            <h2 className="mt-4 text-3xl font-extrabold">{vision.title}</h2>
            <p className="mt-5 leading-7 text-white/60">{vision.body}</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-khaki">MISSION</p>
            <h2 className="mt-4 text-3xl font-extrabold">{mission.title}</h2>
            <p className="mt-5 leading-7 text-white/60">{mission.body}</p>
          </div>
        </div>
      </section>
      <section className="section-space">
        <div className="container-site">
          <SectionHeading title={page?.values.title ?? 'VALUES THAT GUIDE US'} />
          <div className="grid gap-px bg-ink/10 md:grid-cols-5">
            {values.map((v, i) => (
              <div key={v} className="bg-bone p-7">
                <span className="font-display text-4xl font-extrabold text-clay/35">0{i + 1}</span>
                <h3 className="mt-7 font-bold">{v}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function Blog() {
  const {data}=useArticles()
  return <div className="container-site section-space"><Breadcrumbs items={[{label:'Home',to:'/'},{label:'Journal'}]}/><div className="my-10"><p className="text-xs font-bold tracking-[.2em] text-clay">STORIES · TIPS · ADVENTURE</p><h1 className="mt-3 text-5xl font-extrabold md:text-7xl">THE KAMARU JOURNAL</h1></div><div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{data.items.map(a=><article key={a.id} className="bg-white"><Link to={`/blog/${a.slug}`}><div className="aspect-[16/10]"><Media image={a.image}/></div></Link><div className="p-6"><p className="text-[10px] font-bold tracking-widest text-clay">{a.category} · {new Date(a.publishedAt).toLocaleDateString()}</p><h2 className="mt-3 text-2xl font-extrabold"><Link to={`/blog/${a.slug}`}>{a.title}</Link></h2><p className="my-4 text-sm leading-6 text-ink/60">{a.excerpt}</p><Link className="text-xs font-bold tracking-widest" to={`/blog/${a.slug}`}>READ MORE →</Link></div></article>)}</div></div>
}

export function ArticlePage() {
  const {slug}=useParams(), {data:a,loading}=useArticle(slug)
  if(loading)return <div className="container-site section-space">Loading journal...</div>
  if(!a)return <NotFound/>
  return <article><Seo title={`${a.title} | Kamaru Journal`} description={a.excerpt} jsonLd={{'@context':'https://schema.org','@type':'Article',headline:a.title,datePublished:a.publishedAt,description:a.excerpt,publisher:{'@type':'Organization',name:'KAMARU Philippines'}}}/><header className="container-site section-space max-w-4xl text-center"><Breadcrumbs items={[{label:'Home',to:'/'},{label:'Journal',to:'/blog'},{label:a.title}]}/><p className="mt-12 text-xs font-bold tracking-widest text-clay">{a.category}</p><h1 className="mt-4 text-4xl font-extrabold md:text-7xl">{a.title}</h1><p className="mt-5 text-ink/55">{new Date(a.publishedAt).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}</p></header><div className="container-site h-[55vw] max-h-[680px] min-h-[360px]"><Media image={a.image}/></div><div className="mx-auto max-w-3xl section-space px-5">{a.body.map((block, i) => block.type === 'heading' ? <h2 key={i} className="mb-4 text-2xl font-extrabold">{block.text}</h2> : <p key={i} className="mb-6 text-lg leading-8 text-ink/70">{block.text}</p>)}</div></article>
}

export function Contact() {
  const { data: s } = useSiteSettings()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(e.currentTarget)
    try {
      await commerceApi.submitInquiry({
        name: String(form.get('name')),
        email: String(form.get('email')),
        subject: String(form.get('subject')),
        message: String(form.get('message')),
      })
      setSent(true)
      e.currentTarget.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="container-site section-space">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold tracking-[.2em] text-clay">GET IN TOUCH</p>
          <h1 className="mt-4 text-5xl font-extrabold md:text-7xl">LET&apos;S TALK BAGS.</h1>
          <p className="mt-6 max-w-lg leading-7 text-ink/60">Questions about Kamaru products, dealers, or your bulk order? Our team is ready to help.</p>
          <div className="mt-9 space-y-6 text-sm">
            <p className="flex gap-4"><MapPin className="shrink-0 text-clay" />{s?.address}</p>
            <p className="flex gap-4"><Phone className="shrink-0 text-clay" />{s?.phones.join(' · ')}</p>
            <p className="flex gap-4"><Mail className="shrink-0 text-clay" />{s?.inquiryEmail ?? s?.email}</p>
          </div>
        </div>
        <form onSubmit={(e) => void submit(e)} className="space-y-5 bg-white p-7 md:p-10">
          {sent && <p className="text-sm text-olive">Message sent. We will reply to your email soon.</p>}
          {error && <p className="text-sm text-clay">{error}</p>}
          <label className="block text-xs font-bold tracking-wider">NAME<input required name="name" className={`mt-2 ${inputClass}`} /></label>
          <label className="block text-xs font-bold tracking-wider">EMAIL<input required name="email" type="email" className={`mt-2 ${inputClass}`} /></label>
          <label className="block text-xs font-bold tracking-wider">SUBJECT<input required name="subject" className={`mt-2 ${inputClass}`} /></label>
          <label className="block text-xs font-bold tracking-wider">MESSAGE<textarea required name="message" rows={6} className="mt-2 w-full border border-ink/20 p-4 font-normal tracking-normal" /></label>
          <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</Button>
        </form>
      </div>
    </div>
  )
}

export function Cart() {
  const { cart, removeFromCart, updateQuantity } = useStore()
  const { tr } = useLanguage()
  const subtotal = cart.reduce((s, l) => s + l.product.price * l.quantity, 0)
  return (
    <div className="container-site section-space">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1 className="my-9 text-5xl font-extrabold">{tr('bulkCartTitle').toUpperCase()}</h1>
      <p className="mb-8 max-w-2xl text-sm text-ink/60">{tr('retailNote')}</p>
      {!cart.length ? (
        <div className="border border-dashed border-ink/25 py-20 text-center">
          <p className="text-xl">Your bulk cart is empty.</p>
          <Link to="/shop" className="mt-6 inline-block"><Button>Start shopping</Button></Link>
        </div>
      ) : (
        <div className="grid gap-9 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {cart.map((line) => {
              const color = colorOf(line.product, line.colorId)
              return (
              <div key={`${line.product.id}-${line.colorId}`} className="flex flex-wrap items-center gap-5 bg-white p-4">
                <div className="h-28 w-24"><Media image={imageForColor(line.product, line.colorId)} /></div>
                <div className="min-w-44 flex-1">
                  <Link className="font-display text-lg font-bold" to={`/product/${line.product.slug}`}>{line.product.name}</Link>
                  {color && <p className="text-sm text-ink/55">{color.name}{color.description ? ` · ${color.description}` : ''}</p>}
                  <p className="text-sm text-ink/50">{formatPrice(line.product.price)}</p>
                </div>
                <div className="flex items-center border border-ink/15">
                  <button type="button" aria-label="Decrease" className="p-3" onClick={() => updateQuantity(line.product.id, line.colorId, line.quantity - 1)}><Minus size={15} /></button>
                  <span>{line.quantity}</span>
                  <button type="button" aria-label="Increase" className="p-3" onClick={() => updateQuantity(line.product.id, line.colorId, line.quantity + 1)}><Plus size={15} /></button>
                </div>
                <strong className="w-28 text-right">{formatPrice(line.product.price * line.quantity)}</strong>
                <button type="button" onClick={() => removeFromCart(line.product.id, line.colorId)} aria-label="Remove item" className="p-3"><Trash2 size={18} /></button>
              </div>
              )
            })}
          </div>
          <aside className="h-fit bg-ink p-7 text-white">
            <h2 className="text-xl font-extrabold">BULK ORDER SUMMARY</h2>
            <div className="my-6 flex justify-between border-y border-white/15 py-5"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
            <p className="mb-5 text-xs text-white/50">Manual fulfillment via LBC, Lalamove, or pickup after payment review.</p>
            <Link to="/checkout"><Button className="w-full">{tr('checkout')}</Button></Link>
          </aside>
        </div>
      )}
    </div>
  )
}

export function Wishlist() {
  const {wishlist}=useStore(), {data}=useProducts()
  const items=data.items.filter(p=>wishlist.includes(p.id))
  return <div className="container-site section-space"><Breadcrumbs items={[{label:'Home',to:'/'},{label:'Wishlist'}]}/><h1 className="my-9 text-5xl font-extrabold">YOUR WISHLIST</h1>{items.length?<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"><ProductGrid products={items}/></div>:<div className="border border-dashed border-ink/25 py-20 text-center"><p>Save your favorite Kamaru bags here.</p><Link className="mt-6 inline-block" to="/shop"><Button>Explore products</Button></Link></div>}</div>
}

export function Account() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, login, register, logout, isAuthenticated } = useAuth()
  const { tr } = useLanguage()
  const [orders, setOrders] = useState<BulkOrder[]>([])
  const [error, setError] = useState('')
  const [confirmEmailSent, setConfirmEmailSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const next = params.get('next') ?? '/shop'

  useEffect(() => {
    if (user) void commerceApi.listMyOrders(user.id).then(setOrders).catch(() => setOrders([]))
  }, [user])

  if (isAuthenticated && user) {
    return (
      <div className="container-site section-space max-w-3xl">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Account' }]} />
        <div className="mt-9 bg-white p-7 md:p-10">
          <p className="text-xs font-bold tracking-[.2em] text-clay">MEMBER ACCOUNT</p>
          <h1 className="mt-3 text-4xl font-extrabold">{user.fullName}</h1>
          <p className="mt-2 text-sm text-ink/55">{user.email}</p>
          {(user.city || user.province) && <p className="mt-1 text-sm text-ink/45">{[user.city, user.province].filter(Boolean).join(', ')}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/wishlist"><Button variant="outline">Wishlist</Button></Link>
            <Button variant="ghost" onClick={() => void logout()}>{tr('signOut')}</Button>
          </div>
          <h2 className="mt-10 text-xl font-extrabold">Bulk order history</h2>
          {!orders.length ? <p className="mt-3 text-sm text-ink/55">No bulk orders yet.</p> : (
            <ul className="mt-4 space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="border border-ink/10 p-4 text-sm">
                  <p className="font-bold">{formatPrice(o.subtotal)} · {o.status.replace('_', ' ')}</p>
                  <p className="text-ink/50">{new Date(o.createdAt).toLocaleString()} · {o.items.length} line(s)</p>
                  <ul className="mt-2 space-y-1 text-ink/60">
                    {o.items.map((item) => (
                      <li key={`${item.productId}-${item.colorId}`}>{item.productName}{item.colorName ? ` · ${item.colorName}` : ''} × {item.quantity}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    try {
      if (tab === 'login') await login(email, password)
      else {
        const { needsEmailConfirmation } = await register({
          email,
          password,
          fullName: String(form.get('fullName')),
          phone: String(form.get('phone') || '') || undefined,
          ageRange: String(form.get('ageRange') || '') || undefined,
          gender: String(form.get('gender') || '') || undefined,
          city: String(form.get('city') || '') || undefined,
          province: String(form.get('province') || '') || undefined,
        })
        if (needsEmailConfirmation) {
          setConfirmEmailSent(true)
          return
        }
      }
      navigate(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-site section-space max-w-xl">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Account' }]} />
      <div className="mt-9 bg-white p-7 md:p-10">
        <p className="text-xs font-bold tracking-[.2em] text-clay">CUSTOMER ACCOUNT</p>
        <h1 className="mt-3 text-4xl font-extrabold">{tab === 'login' ? 'WELCOME BACK' : 'JOIN KAMARU'}</h1>
        <p className="mt-3 text-sm text-ink/55">{tr('bulkSignUp')}</p>
        {error && <p className="mt-4 text-sm text-clay">{error}</p>}
        {confirmEmailSent && (
          <p className="mt-4 text-sm text-olive">
            We sent a confirmation link to your email. Open it to activate your account, then sign in here.
          </p>
        )}
        <form onSubmit={(e) => void submit(e)} className="mt-7 space-y-4">
          {tab === 'register' && (
            <>
              <input required name="fullName" placeholder="Full name" className={inputClass} />
              <input name="phone" placeholder="Phone" className={inputClass} />
              <div className="grid gap-4 md:grid-cols-2">
                <input name="ageRange" placeholder="Age range (optional)" className={inputClass} />
                <input name="gender" placeholder="Gender (optional)" className={inputClass} />
                <input name="city" placeholder="City" className={inputClass} />
                <input name="province" placeholder="Province" className={inputClass} />
              </div>
            </>
          )}
          <input required name="email" type="email" placeholder="Email address" className={inputClass} />
          <input required name="password" type="password" placeholder="Password" className={inputClass} />
          <Button className="w-full" disabled={busy}>{tab === 'login' ? tr('signIn') : 'Create account'}</Button>
        </form>
        {tab === 'login' && <Link to="/reset-password" className="mt-4 block text-center text-xs font-bold uppercase tracking-wider underline">Forgot password</Link>}
        <button type="button" onClick={() => setTab(tab === 'login' ? 'register' : 'login')} className="mt-5 w-full text-xs font-bold uppercase tracking-wider underline">
          {tab === 'login' ? 'No account? Create one' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

export function NotFound(){return <div className="container-site section-space text-center"><p className="font-display text-8xl font-extrabold text-clay/25">404</p><h1 className="text-4xl font-extrabold">TRAIL NOT FOUND</h1><p className="mt-4 text-ink/55">This page may have moved or never existed.</p><Link className="mt-7 inline-block" to="/"><Button>Back home</Button></Link></div>}
