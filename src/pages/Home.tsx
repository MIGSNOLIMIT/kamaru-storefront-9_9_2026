import { ArrowRight, ChevronLeft, ChevronRight, Droplets, Hammer, HeartHandshake, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useArticles, useCategories, useHomeSections } from '../hooks/useContent'
import { useHomeProductList } from '../lib/homeProducts'
import type { HomeSection, ImageRef } from '../types'
import { ProductGrid } from '../components/Product'
import { Button, Media, SectionHeading } from '../components/UI'
import { heroSlides, homePlaceholder, sectionContent, sectionImage } from '../lib/homeSectionContent'

type BlockProps = { section: HomeSection }

function HeroMedia({ images }: { images: ImageRef[] }) {
  const [index, setIndex] = useState(0)
  const count = images.length
  useEffect(() => {
    if (count < 2) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), 5000)
    return () => window.clearInterval(timer)
  }, [count])
  const current = images[index] ?? images[0]
  if (!current || count < 2) {
    return <div className="absolute inset-0 opacity-60"><Media eager image={current} /></div>
  }
  const go = (next: number) => setIndex((next + count) % count)
  return (
    <div className="absolute inset-0">
      {images.map((image, i) => (
        <div key={`${image.id}-${i}`} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-60' : 'opacity-0'}`} aria-hidden={i !== index}>
          <Media eager={i === index} image={image} />
        </div>
      ))}
      <button type="button" aria-label="Previous hero image" onClick={() => go(index - 1)} className="absolute left-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center bg-white/90 text-ink">
        <ChevronLeft />
      </button>
      <button type="button" aria-label="Next hero image" onClick={() => go(index + 1)} className="absolute right-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center bg-white/90 text-ink">
        <ChevronRight />
      </button>
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {images.map((image, i) => (
          <button key={`${image.id}-dot-${i}`} type="button" aria-label={`Show hero image ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} className={`size-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/45'}`} />
        ))}
      </div>
    </div>
  )
}

function HeroBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const kicker = c.subheadline || 'KAMARU PHILIPPINES · SINCE 1988'
  const title = c.headline || 'GAWANG PINOY.\nTIBAY PINOY!'
  const subtitle = c.body || 'Durable bags designed to carry your everyday adventures.'
  const primaryLabel = c.ctaLabel || 'Shop now'
  const primaryHref = c.ctaHref || '/shop'
  const slides = heroSlides(c, homePlaceholder('home-hero', 'Kamaru bags in an outdoor Filipino landscape'))
  return (
    <section className="relative flex min-h-[570px] items-end overflow-hidden bg-ink md:min-h-[700px] md:items-center">
      <HeroMedia images={slides} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
      <div className="container-site relative z-10 pb-16 text-white md:pb-0">
        <div className="animate-reveal max-w-3xl text-center md:text-left">
          <p className="mb-5 text-xs font-bold tracking-[.28em] text-khaki">{kicker}</p>
          <h1 className="text-5xl font-extrabold leading-[.94] tracking-tight sm:text-6xl md:text-8xl">
            {title.split('\n').map((line, i) => (
              <span key={i}>{i > 0 && <br />}{line}</span>
            ))}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/75 md:mx-0 md:text-lg">{subtitle}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
            <Link to={primaryHref}><Button className="w-full sm:w-auto">{primaryLabel}</Button></Link>
            <Link to="/about"><Button variant="light" className="w-full sm:w-auto">Explore Kamaru</Button></Link>
          </div>
        </div>
      </div>
    </section>
  )
}

const benefitIcons = [Droplets, Hammer, MapPin, HeartHandshake] as const
const defaultBenefits = [
  ['WATER RESISTANT', 'Built to handle everyday adventures.'],
  ['DURABLE MATERIALS', 'Made for long-lasting use.'],
  ['FILIPINO BRAND', 'Proudly serving Filipino customers.'],
  ['DESIGNED FOR COMFORT', 'Carry your load with ease.'],
] as const

function BenefitsBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const items = c.items?.length
    ? c.items.slice(0, 4)
    : defaultBenefits.map(([title, text]) => ({ title, text }))
  return (
    <section className="border-b border-ink/10 bg-white">
      <div className="container-site grid grid-cols-2 py-8 lg:grid-cols-4">
        {items.map((item, i) => {
          const Icon = benefitIcons[i] ?? Droplets
          const title = item.title ?? defaultBenefits[i]?.[0] ?? ''
          const text = item.text ?? defaultBenefits[i]?.[1] ?? ''
          return (
            <div key={title} className={`px-4 py-5 text-center ${i % 2 ? 'border-l border-ink/10' : ''} lg:border-l lg:first:border-l-0`}>
              <Icon className="mx-auto mb-3 text-clay" size={24} />
              <h3 className="text-xs font-extrabold tracking-[.12em]">{title}</h3>
              <p className="mt-1 text-xs text-ink/55">{text}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FeaturedCategoriesBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const { data } = useCategories()
  const wanted = ['backpacks', 'adventure-bags', 'travel-bags', 'shoulder-bags']
  const title = c.headline || 'FIND YOUR PERFECT KAMARU'
  const text = c.body || 'From everyday backpacks to travel and outdoor gear.'
  return (
    <section className="section-space">
      <div className="container-site">
        <SectionHeading title={title} text={text} />
        <div className="grid gap-4 md:grid-cols-2">
          {wanted.map((slug, i) => {
            const cat = data.find((x) => x.slug === slug)
            if (!cat) return null
            return (
              <Link to={`/shop?category=${encodeURIComponent(cat.slug)}`} key={slug} className={`group relative min-h-[360px] overflow-hidden ${i === 0 || i === 3 ? 'md:min-h-[480px]' : ''}`}>
                <Media image={cat.image} className="transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                <div className="absolute bottom-0 p-7 text-white">
                  <h3 className="text-2xl font-extrabold">{cat.name.toUpperCase()}</h3>
                  <p className="my-2 text-sm text-white/65">{cat.description}</p>
                  <span className="text-xs font-bold tracking-widest">SHOP NOW <ArrowRight className="inline" size={14} /></span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function NewArrivalsBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const products = useHomeProductList(c.productIds, { flag: 'newArrival', limit: 8 })
  const title = c.headline || 'NEW ARRIVAL'
  const text = c.body || 'Pack it right. Fit it right.'
  const ctaLabel = c.ctaLabel || 'View all arrivals'
  const ctaHref = c.ctaHref || '/shop?sort=newest'
  return (
    <section className="section-space bg-[#eae5d9]">
      <div className="container-site">
        <SectionHeading title={title} text={text} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"><ProductGrid products={products} /></div>
        <div className="mt-10 text-center"><Link to={ctaHref}><Button variant="outline">{ctaLabel}</Button></Link></div>
      </div>
    </section>
  )
}

function EditorialBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const kicker = c.subheadline || 'KAMARU OUTDOOR'
  const title = c.headline || 'LOAD UP YOUR KAMARU BAG'
  const body = c.body || 'Designed for everyday movement, travel and adventure. Carry your essentials with confidence, comfort and style.'
  const ctaLabel = c.ctaLabel || 'Explore adventure bags'
  const ctaHref = c.ctaHref || '/shop?category=travelling-bag'
  const img = sectionImage(c, homePlaceholder('outdoor-editorial', 'Kamaru bag used outdoors'))
  return (
    <section className="section-space">
      <div className="container-site grid items-center gap-10 lg:grid-cols-[1.2fr_.8fr]">
        <div className="h-[520px]"><Media image={img} /></div>
        <div className="lg:-ml-20 lg:bg-bone lg:p-14">
          <p className="text-xs font-bold tracking-[.2em] text-clay">{kicker}</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">{title}</h2>
          <p className="my-6 max-w-lg leading-7 text-ink/65">{body}</p>
          <Link to={ctaHref}><Button>{ctaLabel}</Button></Link>
        </div>
      </div>
    </section>
  )
}

function WaterResistantBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const title = c.headline || 'WATER RESISTANT.\nREADY FOR THE JOURNEY.'
  const badgeLines = c.body?.split('\n').map((l) => l.trim()).filter(Boolean) ?? ['WATER RESISTANT', 'DURABLE MATERIAL', 'EVERYDAY READY']
  const ctaLabel = c.ctaLabel || 'Shop bags'
  const ctaHref = c.ctaHref || '/shop'
  const img = sectionImage(c, homePlaceholder('water-resistant', 'Close-up of a water-resistant Kamaru bag'))
  return (
    <section className="container-site relative min-h-[590px] overflow-hidden bg-ink">
      <div className="absolute inset-0 opacity-50"><Media image={img} /></div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
      <div className="relative z-10 flex min-h-[590px] flex-col justify-center p-8 text-white md:p-16">
        <h2 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-7xl">
          {title.split('\n').map((line, i) => (
            <span key={i}>{i > 0 && <br />}{line}</span>
          ))}
        </h2>
        <div className="mt-8 w-fit border border-white/25 bg-black/50 p-5 text-xs font-bold tracking-[.16em]">
          {badgeLines.map((line) => (
            <p key={line} className={line !== badgeLines[0] ? 'my-3' : undefined}>{line}</p>
          ))}
        </div>
        <Link to={ctaHref} className="mt-7"><Button>{ctaLabel}</Button></Link>
      </div>
    </section>
  )
}

function StoryBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const kicker = c.subheadline || 'OUR STORY'
  const title = c.headline || 'BUILT WITH FILIPINO PRIDE'
  const body = c.body || 'Kamaru is a 100% Filipino-owned bag brand with roots dating back to 1988. GLPPI began as a home-based company specializing in quality bags and developed Kamaru into a recognized name made to carry every kind of Filipino journey.'
  const quote = '“GAWANG PINOY. TIBAY PINOY!”'
  const ctaLabel = c.ctaLabel || 'Our story'
  const ctaHref = c.ctaHref || '/about'
  const img = sectionImage(c, homePlaceholder('kamaru-story', 'Historical Kamaru workshop and brand story'))
  return (
    <section className="section-space">
      <div className="container-site grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold tracking-[.2em] text-clay">{kicker}</p>
          <h2 className="mt-4 text-4xl font-extrabold md:text-6xl">{title}</h2>
          <p className="mt-6 leading-7 text-ink/65">{body}</p>
          <p className="mt-5 font-display text-xl font-extrabold">{quote}</p>
          <Link to={ctaHref} className="mt-7 inline-block"><Button variant="outline">{ctaLabel}</Button></Link>
        </div>
        <div className="h-[480px]"><Media image={img} /></div>
      </div>
    </section>
  )
}

function BestSellersBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const products = useHomeProductList(c.productIds, { flag: 'bestSeller', limit: 6 })
  const title = c.headline || 'BEST SELLERS'
  const text = c.body || 'Proven Kamaru carry for every kind of day.'
  return (
    <section className="section-space bg-ink text-white">
      <div className="container-site">
        <SectionHeading title={title} text={text} />
        <div className="scrollbar-hide flex snap-x gap-5 overflow-x-auto pb-6">
          {products.map((p) => (
            <div key={p.id} className="w-[78vw] shrink-0 snap-start text-ink sm:w-[45vw] lg:w-[calc(25%-15px)]">
              <ProductGrid products={[p]} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LifestyleBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const title = c.headline || 'TRAVEL WITH STYLE.\nTRAVEL WITH COMFORT.'
  const body = c.body || "Wherever you're headed, Kamaru is ready to carry the load."
  const ctaLabel = c.ctaLabel || 'Shop travel bags'
  const ctaHref = c.ctaHref || '/shop?category=travelling-bag'
  const img = sectionImage(c, homePlaceholder('travel-banner', 'Kamaru travel bags on a journey'))
  return (
    <section className="relative my-0 flex min-h-[520px] items-center bg-ink text-white">
      <div className="absolute inset-0 opacity-50"><Media image={img} /></div>
      <div className="absolute inset-0 bg-black/45" />
      <div className="container-site relative z-10 text-center">
        <h2 className="text-4xl font-extrabold md:text-7xl">
          {title.split('\n').map((line, i) => (
            <span key={i}>{i > 0 && <br />}{line}</span>
          ))}
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-white/70">{body}</p>
        <Link to={ctaHref} className="mt-7 inline-block"><Button>{ctaLabel}</Button></Link>
      </div>
    </section>
  )
}

function JournalBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const { data } = useArticles()
  const title = c.headline || 'FROM THE KAMARU JOURNAL'
  return (
    <section className="section-space">
      <div className="container-site">
        <SectionHeading title={title} text={c.body} />
        <div className="grid gap-6 md:grid-cols-3">
          {data.items.map((a) => (
            <article key={a.id} className="bg-white">
              <Link to={`/blog/${a.slug}`}><div className="aspect-[16/10]"><Media image={a.image} /></div></Link>
              <div className="p-6">
                <p className="text-[10px] font-bold tracking-widest text-clay">{a.category} · {new Date(a.publishedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <h3 className="mt-3 text-xl font-extrabold"><Link to={`/blog/${a.slug}`}>{a.title}</Link></h3>
                <p className="my-3 text-sm leading-6 text-ink/60">{a.excerpt}</p>
                <Link to={`/blog/${a.slug}`} className="text-xs font-bold tracking-widest">READ MORE →</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function NewsletterBlock({ section }: BlockProps) {
  const c = sectionContent(section)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const title = c.headline || 'STAY IN THE LOOP'
  const subtitle = c.body || 'Get updates on new arrivals, promotions and Kamaru adventures.'
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
          <h2 className="text-3xl font-extrabold">{title}</h2>
          <p className="mt-2 text-white/70">{subtitle}</p>
        </div>
        <form onSubmit={(e) => void submit(e)} className="w-full max-w-xl space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter" className="sr-only">Email address</label>
            <input required type="email" id="newsletter" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="min-h-12 min-w-0 flex-1 bg-white px-5 text-ink" />
            <Button type="submit" disabled={busy} className="bg-ink hover:bg-black">{busy ? '…' : (c.ctaLabel || 'Subscribe')}</Button>
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

const registry: Record<HomeSection['type'], React.ComponentType<BlockProps>> = {
  hero: HeroBlock,
  benefits: BenefitsBlock,
  categories: FeaturedCategoriesBlock,
  'new-arrivals': NewArrivalsBlock,
  editorial: EditorialBlock,
  'water-resistant': WaterResistantBlock,
  story: StoryBlock,
  'best-sellers': BestSellersBlock,
  lifestyle: LifestyleBlock,
  journal: JournalBlock,
  newsletter: NewsletterBlock,
}

export default function Home() {
  const { data, loading } = useHomeSections()
  if (loading && !data.length) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-xs font-bold tracking-[.2em] text-ink/45">
        LOADING KAMARU
      </div>
    )
  }
  return (
    <>
      {data.map((section) => {
        const Component = registry[section.type]
        return <Component key={section.id} section={section} />
      })}
    </>
  )
}
