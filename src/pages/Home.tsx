import { ArrowRight, Droplets, Hammer, HeartHandshake, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useArticles, useCategories, useHomeSections, useProducts } from '../hooks/useContent'
import type { HomeSection } from '../types'
import { ProductGrid } from '../components/Product'
import { Button, Media, SectionHeading } from '../components/UI'

const placeholder = (id: string, alt: string, ratio: 'portrait' | 'landscape' = 'landscape') => ({ id, alt, width: ratio === 'landscape' ? 1600 : 900, height: ratio === 'landscape' ? 900 : 1100 })

function Hero() {
  return <section className="relative flex min-h-[570px] items-end overflow-hidden bg-ink md:min-h-[700px] md:items-center"><div className="absolute inset-0 opacity-60"><Media eager image={placeholder('home-hero','Kamaru bags in an outdoor Filipino landscape')} /></div><div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent"/><div className="container-site relative z-10 pb-16 text-white md:pb-0"><div className="animate-reveal max-w-3xl text-center md:text-left"><p className="mb-5 text-xs font-bold tracking-[.28em] text-khaki">KAMARU PHILIPPINES · SINCE 1988</p><h1 className="text-5xl font-extrabold leading-[.94] tracking-tight sm:text-6xl md:text-8xl">GAWANG PINOY.<br/>TIBAY PINOY!</h1><p className="mx-auto mt-6 max-w-xl text-base text-white/75 md:mx-0 md:text-lg">Durable bags designed to carry your everyday adventures.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row md:justify-start"><Link to="/shop"><Button className="w-full sm:w-auto">Shop now</Button></Link><Link to="/about"><Button variant="light" className="w-full sm:w-auto">Explore Kamaru</Button></Link></div></div></div></section>
}

function Benefits() {
  const items = [[Droplets,'WATER RESISTANT','Built to handle everyday adventures.'],[Hammer,'DURABLE MATERIALS','Made for long-lasting use.'],[MapPin,'FILIPINO BRAND','Proudly serving Filipino customers.'],[HeartHandshake,'DESIGNED FOR COMFORT','Carry your load with ease.']] as const
  return <section className="border-b border-ink/10 bg-white"><div className="container-site grid grid-cols-2 py-8 lg:grid-cols-4">{items.map(([Icon,title,text],i) => <div key={title} className={`px-4 py-5 text-center ${i % 2 ? 'border-l border-ink/10' : ''} lg:border-l lg:first:border-l-0`}><Icon className="mx-auto mb-3 text-clay" size={24}/><h3 className="text-xs font-extrabold tracking-[.12em]">{title}</h3><p className="mt-1 text-xs text-ink/55">{text}</p></div>)}</div></section>
}

function FeaturedCategories() {
  const { data } = useCategories()
  const wanted = ['backpacks','adventure-bags','travel-bags','shoulder-bags']
  return <section className="section-space"><div className="container-site"><SectionHeading title="FIND YOUR PERFECT KAMARU" text="From everyday backpacks to travel and outdoor gear."/><div className="grid gap-4 md:grid-cols-2">{wanted.map((slug,i) => { const c=data.find((x)=>x.slug===slug); if(!c)return null; return <Link to={`/shop?category=${encodeURIComponent(c.slug)}`} key={slug} className={`group relative min-h-[360px] overflow-hidden ${i===0||i===3?'md:min-h-[480px]':''}`}><Media image={c.image} className="transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent"/><div className="absolute bottom-0 p-7 text-white"><h3 className="text-2xl font-extrabold">{c.name.toUpperCase()}</h3><p className="my-2 text-sm text-white/65">{c.description}</p><span className="text-xs font-bold tracking-widest">SHOP NOW <ArrowRight className="inline" size={14}/></span></div></Link>})}</div></div></section>
}

function NewArrivals() {
  const { data } = useProducts({ flag:'newArrival', limit:8 })
  return <section className="section-space bg-[#eae5d9]"><div className="container-site"><SectionHeading title="NEW ARRIVAL" text="Pack it right. Fit it right."/><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"><ProductGrid products={data.items}/></div><div className="mt-10 text-center"><Link to="/shop?sort=newest"><Button variant="outline">View all arrivals</Button></Link></div></div></section>
}

function Editorial() {
  return <section className="section-space"><div className="container-site grid items-center gap-10 lg:grid-cols-[1.2fr_.8fr]"><div className="h-[520px]"><Media image={placeholder('outdoor-editorial','Kamaru bag used outdoors')}/></div><div className="lg:-ml-20 lg:bg-bone lg:p-14"><p className="text-xs font-bold tracking-[.2em] text-clay">KAMARU OUTDOOR</p><h2 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">LOAD UP YOUR KAMARU BAG</h2><p className="my-6 max-w-lg leading-7 text-ink/65">Designed for everyday movement, travel and adventure. Carry your essentials with confidence, comfort and style.</p><Link to="/shop?category=travelling-bag"><Button>Explore adventure bags</Button></Link></div></div></section>
}

function WaterResistant() {
  return <section className="container-site relative min-h-[590px] overflow-hidden bg-ink"><div className="absolute inset-0 opacity-50"><Media image={placeholder('water-resistant','Close-up of a water-resistant Kamaru bag')}/></div><div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"/><div className="relative z-10 flex min-h-[590px] flex-col justify-center p-8 text-white md:p-16"><h2 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-7xl">WATER RESISTANT.<br/>READY FOR THE JOURNEY.</h2><div className="mt-8 w-fit border border-white/25 bg-black/50 p-5 text-xs font-bold tracking-[.16em]"><p>WATER RESISTANT</p><p className="my-3">DURABLE MATERIAL</p><p>EVERYDAY READY</p></div><Link to="/shop" className="mt-7"><Button>Shop bags</Button></Link></div></section>
}

function Story() {
  return <section className="section-space"><div className="container-site grid items-center gap-10 lg:grid-cols-2"><div><p className="text-xs font-bold tracking-[.2em] text-clay">OUR STORY</p><h2 className="mt-4 text-4xl font-extrabold md:text-6xl">BUILT WITH FILIPINO PRIDE</h2><p className="mt-6 leading-7 text-ink/65">Kamaru is a 100% Filipino-owned bag brand with roots dating back to 1988. GLPPI began as a home-based company specializing in quality bags and developed Kamaru into a recognized name made to carry every kind of Filipino journey.</p><p className="mt-5 font-display text-xl font-extrabold">“GAWANG PINOY. TIBAY PINOY!”</p><Link to="/about" className="mt-7 inline-block"><Button variant="outline">Our story</Button></Link></div><div className="h-[480px]"><Media image={placeholder('kamaru-story','Historical Kamaru workshop and brand story')}/></div></div></section>
}

function BestSellers() {
  const { data } = useProducts({ flag:'bestSeller', limit:6 })
  return <section className="section-space bg-ink text-white"><div className="container-site"><SectionHeading title="BEST SELLERS" text="Proven Kamaru carry for every kind of day."/><div className="scrollbar-hide flex snap-x gap-5 overflow-x-auto pb-6">{data.items.map((p) => <div key={p.id} className="w-[78vw] shrink-0 snap-start text-ink sm:w-[45vw] lg:w-[calc(25%-15px)]"><ProductGrid products={[p]}/></div>)}</div></div></section>
}

function Lifestyle() {
  return <section className="relative my-0 flex min-h-[520px] items-center bg-ink text-white"><div className="absolute inset-0 opacity-50"><Media image={placeholder('travel-banner','Kamaru travel bags on a journey')}/></div><div className="absolute inset-0 bg-black/45"/><div className="container-site relative z-10 text-center"><h2 className="text-4xl font-extrabold md:text-7xl">TRAVEL WITH STYLE.<br/>TRAVEL WITH COMFORT.</h2><p className="mx-auto mt-5 max-w-lg text-white/70">Wherever you're headed, Kamaru is ready to carry the load.</p><Link to="/shop?category=travelling-bag" className="mt-7 inline-block"><Button>Shop travel bags</Button></Link></div></section>
}

function Journal() {
  const { data } = useArticles()
  return <section className="section-space"><div className="container-site"><SectionHeading title="FROM THE KAMARU JOURNAL"/><div className="grid gap-6 md:grid-cols-3">{data.items.map((a) => <article key={a.id} className="bg-white"><Link to={`/blog/${a.slug}`}><div className="aspect-[16/10]"><Media image={a.image}/></div></Link><div className="p-6"><p className="text-[10px] font-bold tracking-widest text-clay">{a.category} · {new Date(a.publishedAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</p><h3 className="mt-3 text-xl font-extrabold"><Link to={`/blog/${a.slug}`}>{a.title}</Link></h3><p className="my-3 text-sm leading-6 text-ink/60">{a.excerpt}</p><Link to={`/blog/${a.slug}`} className="text-xs font-bold tracking-widest">READ MORE →</Link></div></article>)}</div></div></section>
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!consent) {
      setErr('Please agree to receive email updates.')
      return
    }
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      const res = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((body as { error?: string }).error ?? 'Subscribe failed')
      setMsg('Thanks for joining the Kamaru list!')
      setEmail('')
      setConsent(false)
      e.currentTarget.reset()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Subscribe failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="bg-clay py-16 text-white">
      <div className="container-site flex flex-col items-center justify-between gap-7 text-center lg:flex-row lg:text-left">
        <div>
          <h2 className="text-3xl font-extrabold">STAY IN THE LOOP</h2>
          <p className="mt-2 text-white/70">Get updates on new arrivals, promotions and Kamaru adventures.</p>
        </div>
        <form onSubmit={(e) => void submit(e)} className="w-full max-w-xl space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter" className="sr-only">Email address</label>
            <input required type="email" id="newsletter" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="min-h-12 min-w-0 flex-1 bg-white px-5 text-ink" />
            <Button type="submit" disabled={busy} className="bg-ink hover:bg-black">{busy ? '…' : 'Subscribe'}</Button>
          </div>
          <label className="flex items-start gap-2 text-left text-xs text-white/80">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            I agree to receive marketing emails from Kamaru Philippines.
          </label>
          {msg && <p className="text-sm text-white/90">{msg}</p>}
          {err && <p className="text-sm text-bone">{err}</p>}
        </form>
      </div>
    </section>
  )
}

const registry: Record<HomeSection['type'], React.ComponentType> = { hero:Hero, benefits:Benefits, categories:FeaturedCategories, 'new-arrivals':NewArrivals, editorial:Editorial, 'water-resistant':WaterResistant, story:Story, 'best-sellers':BestSellers, lifestyle:Lifestyle, journal:Journal, newsletter:Newsletter }
export default function Home() { const {data}=useHomeSections(); return <>{data.map((section)=>{const Component=registry[section.type];return <Component key={section.id}/>})}</> }
