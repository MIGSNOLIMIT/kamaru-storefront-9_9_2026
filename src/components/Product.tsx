import { useState } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { useStore } from '../state/StoreContext'
import { Button, Media, Modal } from './UI'

export const formatPrice = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

export function ColorSwatches({ product, selected, onSelect }: { product: Product; selected?: string; onSelect?: (id: string) => void }) {
  return <div className="flex flex-wrap gap-2" aria-label="Available colors">{product.colors.map((color) => <button key={color.id} type="button" onClick={() => onSelect?.(color.id)} title={color.name} aria-label={color.name} className={`size-6 rounded-full border-2 ${selected === color.id ? 'border-clay ring-2 ring-clay/30' : 'border-white ring-1 ring-black/20'}`} style={{ backgroundColor: color.hex }} />)}</div>
}

export function QuantityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return <div className="inline-flex h-12 border border-ink/25"><button className="w-11" aria-label="Decrease quantity" onClick={() => onChange(Math.max(1, value - 1))}>−</button><span className="grid w-10 place-items-center" aria-live="polite">{value}</span><button className="w-11" aria-label="Increase quantity" onClick={() => onChange(value + 1)}>+</button></div>
}

export function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist, addToCart } = useStore()
  const [quick, setQuick] = useState(false)
  const wished = wishlist.includes(product.id)
  return (
    <>
      <article className="group relative bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="relative aspect-[4/5] overflow-hidden">
          <Link to={`/product/${product.slug}`} aria-label={`View ${product.name}`}><Media image={product.images[0]} className="transition duration-500 group-hover:scale-105" /></Link>
          {!product.inStock && <span className="absolute left-3 top-3 bg-ink px-3 py-1 text-[10px] font-bold text-white">SOLD OUT</span>}
          <button onClick={() => toggleWishlist(product.id)} aria-label={`${wished ? 'Remove from' : 'Add to'} wishlist`} className="absolute right-3 top-3 grid size-10 place-items-center bg-bone/95"><Heart size={18} fill={wished ? 'currentColor' : 'none'} className={wished ? 'text-clay' : ''} /></button>
          <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-100 transition md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-within:translate-y-0 md:focus-within:opacity-100">
            <Button variant="light" className="flex-1 px-2" onClick={() => setQuick(true)}>Quick view</Button>
            <Button className="flex-1 px-2" disabled={!product.inStock} onClick={() => addToCart(product)}>{product.inStock ? 'Add to cart' : 'Sold out'}</Button>
          </div>
        </div>
        <div className="p-5">
          <div className="mb-2 flex items-start justify-between gap-3"><Link to={`/product/${product.slug}`} className="font-display text-lg font-bold hover:text-clay">{product.name}</Link><span className="shrink-0 font-semibold">{formatPrice(product.price)}</span></div>
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-ink/60">{product.features.slice(0,2).join(' · ')}</p>
          <ColorSwatches product={product} />
        </div>
      </article>
      <Modal open={quick} onClose={() => setQuick(false)} title={`Quick view ${product.name}`}>
        <div className="grid gap-8 md:grid-cols-2"><div className="aspect-[4/5]"><Media image={product.images[0]} /></div><div className="self-center"><p className="text-xs font-bold tracking-[.2em] text-clay">QUICK VIEW</p><h2 className="mt-2 text-3xl font-extrabold">{product.name}</h2><p className="mt-3 text-xl font-semibold">{formatPrice(product.price)}</p><ul className="my-5 space-y-2 text-sm text-ink/65">{product.features.slice(0,4).map((f) => <li key={f}>— {f}</li>)}</ul><Button className="w-full" disabled={!product.inStock} onClick={() => { addToCart(product); setQuick(false) }}><ShoppingBag className="mr-2 inline" size={16} /> Add to cart</Button><Link to={`/product/${product.slug}`} onClick={() => setQuick(false)} className="mt-4 block text-center text-xs font-bold uppercase tracking-widest underline">View full details</Link></div></div>
      </Modal>
    </>
  )
}

export function ProductGrid({ products, empty = 'No products match your filters.' }: { products: Product[]; empty?: string }) {
  if (!products.length) return <div className="col-span-full border border-dashed border-ink/30 p-12 text-center text-ink/60">{empty}</div>
  return <>{products.map((product) => <ProductCard key={product.id} product={product} />)}</>
}
