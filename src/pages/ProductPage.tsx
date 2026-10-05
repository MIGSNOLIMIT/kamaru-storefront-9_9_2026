import { useState } from 'react'
import { Heart, ShieldCheck, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs, Button, Media } from '../components/UI'
import { ColorSwatches, formatPrice, ProductGrid, QuantityStepper } from '../components/Product'
import { MarketplaceButtons } from '../components/MarketplaceButtons'
import { useProduct, useProducts } from '../hooks/useContent'
import { useStore } from '../state/StoreContext'
import { useAuth } from '../state/AuthContext'
import { useLanguage } from '../state/LanguageContext'
import { Seo } from '../components/Seo'

export default function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { tr } = useLanguage()
  const { isAuthenticated } = useAuth()
  const { data: product, loading } = useProduct(slug)
  const { data: related } = useProducts({ category: product?.categoryIds[0], limit: 5 })
  const { addToCart, wishlist, toggleWishlist } = useStore()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState('description')

  if (loading) return <div className="container-site section-space"><div className="h-[600px] animate-pulse bg-ink/10" /></div>
  if (!product) {
    return (
      <div className="container-site section-space text-center">
        <h1 className="text-4xl font-extrabold">PRODUCT NOT FOUND</h1>
        <Link to="/shop" className="mt-6 inline-block"><Button>Return to shop</Button></Link>
      </div>
    )
  }

  const colorId = selectedColor || product.colors[0]?.id
  const accountNext = `/product/${product.slug}`

  const buyNow = () => {
    if (!isAuthenticated) {
      navigate(`/account?next=${encodeURIComponent(accountNext)}`)
      return
    }
    addToCart(product, colorId, quantity)
    navigate('/checkout')
  }

  return (
    <div className="container-site section-space">
      <Seo
        title={`${product.name} | Kamaru Philippines`}
        description={product.shortDescription}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          sku: product.sku,
          description: product.shortDescription,
          brand: { '@type': 'Brand', name: 'KAMARU' },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'PHP',
            price: product.price,
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        }}
      />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: product.name }]} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_.92fr]">
        <div>
          <div className="aspect-[4/5]"><Media image={product.images[selectedImage]} /></div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {product.images.map((img, i) => (
              <button key={img.id} type="button" onClick={() => setSelectedImage(i)} className={`aspect-square overflow-hidden border-2 ${i === selectedImage ? 'border-clay' : 'border-transparent'}`} aria-label={`View image ${i + 1}`}>
                <Media image={img} />
              </button>
            ))}
          </div>
        </div>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-bold tracking-[.2em] text-clay">{product.inStock ? 'IN STOCK' : 'SOLD OUT'}</p>
          <h1 className="mt-3 text-4xl font-extrabold md:text-6xl">{product.name}</h1>
          <p className="mt-4 text-2xl font-semibold">{formatPrice(product.price)}</p>
          <p className="mt-6 leading-7 text-ink/65">{product.shortDescription}</p>
          <p className="mt-4 text-xs leading-6 text-ink/50">{tr('retailNote')}</p>
          <div className="my-7 space-y-4">
            <MarketplaceButtons links={product.marketplace} />
          </div>
          <div className="my-7 border-y border-ink/15 py-7">
            <p className="mb-3 text-xs font-bold tracking-widest">COLOR</p>
            <ColorSwatches product={product} selected={colorId} onSelect={setSelectedColor} />
          </div>
          {isAuthenticated ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <QuantityStepper value={quantity} onChange={setQuantity} />
              <Button className="min-h-12 flex-1" disabled={!product.inStock} onClick={() => addToCart(product, colorId, quantity)}>
                {product.inStock ? tr('addToCart') : 'Sold out'}
              </Button>
              <Button className="min-h-12 flex-1" variant="outline" disabled={!product.inStock} onClick={buyNow}>
                {tr('buyNow')}
              </Button>
            </div>
          ) : (
            <Link to={`/account?next=${encodeURIComponent(accountNext)}`} className="block">
              <Button className="min-h-12 w-full">{tr('bulkSignUp')}</Button>
            </Link>
          )}
          <button type="button" onClick={() => toggleWishlist(product.id)} className="mt-4 flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <Heart size={17} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} className={wishlist.includes(product.id) ? 'text-clay' : ''} />
            {wishlist.includes(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
          </button>
          {product.materials.length > 0 && (
            <p className="mt-5 text-xs text-ink/55">
              Materials: {product.materials.map((m) => m.replace(/-/g, ' ')).join(', ')}
            </p>
          )}
          <dl className="mt-7 grid grid-cols-[100px_1fr] gap-2 border-t border-ink/15 pt-6 text-xs">
            <dt className="text-ink/45">SKU</dt><dd>{product.sku ?? 'Pending'}</dd>
            <dt className="text-ink/45">Dimensions</dt><dd>{product.specs.dimensions ?? 'Specifications pending'}</dd>
            <dt className="text-ink/45">Load capacity</dt><dd>{product.specs.loadCapacity ?? 'Specifications pending'}</dd>
          </dl>
          {product.dataQuality === 'placeholder' && (
            <p className="mt-4 border-l-2 border-khaki pl-3 text-xs text-ink/50">Unverified technical details are intentionally left pending for the content team.</p>
          )}
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="flex gap-3 bg-white p-4 text-xs"><ShieldCheck className="text-clay" /><span><strong className="block">BUILT TO LAST</strong>Durable materials</span></div>
            <div className="flex gap-3 bg-white p-4 text-xs"><Truck className="text-clay" /><span><strong className="block">LOCAL BRAND</strong>Proudly Filipino</span></div>
          </div>
        </div>
      </div>
      <div className="section-space">
        <div className="flex gap-7 overflow-auto border-b border-ink/20">
          {['description', 'additional information', 'reviews'].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`shrink-0 border-b-2 py-4 text-xs font-bold uppercase tracking-widest ${tab === t ? 'border-clay text-clay' : 'border-transparent'}`}>{t}</button>
          ))}
        </div>
        <div className="max-w-3xl py-8 text-ink/65">
          {tab === 'description' && (
            <>
              <p className="mb-5">{product.shortDescription}</p>
              <ul className="space-y-2">{product.features.map((f) => <li key={f}>— {f}</li>)}</ul>
            </>
          )}
          {tab === 'additional information' && (
            <dl className="grid grid-cols-2 gap-4">
              <dt>Dimensions</dt><dd>{product.specs.dimensions ?? 'Pending'}</dd>
              <dt>Load Capacity</dt><dd>{product.specs.loadCapacity ?? 'Pending'}</dd>
              <dt>Colors</dt><dd>{product.colors.map((c) => c.name).join(', ')}</dd>
            </dl>
          )}
          {tab === 'reviews' && <p>No reviews yet. Be the first to share your experience.</p>}
        </div>
      </div>
      <section>
        <h2 className="mb-8 text-3xl font-extrabold">RELATED PRODUCTS</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ProductGrid products={related.items.filter((p) => p.id !== product.id).slice(0, 4)} />
        </div>
      </section>
    </div>
  )
}
