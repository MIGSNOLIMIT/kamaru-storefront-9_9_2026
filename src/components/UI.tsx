import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import type { ImageRef } from '../types'

export function Button({ className, variant = 'solid', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'outline' | 'light' | 'ghost' }) {
  return <button className={twMerge('min-h-11 px-5 py-3 text-xs font-bold tracking-[.16em] uppercase transition disabled:cursor-not-allowed disabled:opacity-50', variant === 'solid' && 'bg-clay text-white hover:bg-[#c2410c]', variant === 'outline' && 'border border-ink bg-transparent hover:bg-ink hover:text-white', variant === 'light' && 'bg-bone text-ink hover:bg-white', variant === 'ghost' && 'text-ink/60 hover:text-clay', className)} {...props} />
}

export function Media({ image, className = '', eager = false, compact = false }: { image: ImageRef; className?: string; eager?: boolean; compact?: boolean }) {
  if (image.src) return <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading={eager ? 'eager' : 'lazy'} decoding="async" className={twMerge('h-full w-full bg-ink/5 object-contain', className)} />
  if (compact) {
    return (
      <div
        role="img"
        aria-label={image.alt}
        className={twMerge('h-full w-full bg-white/10', className)}
      />
    )
  }
  const hue = [...image.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 25
  return (
    <div role="img" aria-label={`${image.alt} — image pending`} className={twMerge('relative flex h-full min-h-52 w-full items-center justify-center overflow-hidden bg-ink text-bone', className)}
      style={{ backgroundImage: `linear-gradient(${115 + hue}deg, transparent 42%, rgba(169,157,125,.18) 43%, transparent 44%), repeating-linear-gradient(35deg, transparent 0 34px, rgba(255,255,255,.025) 35px 36px)` }}>
      <div className="text-center">
        <span className="font-display text-2xl font-extrabold tracking-[.24em]">KAMARU</span>
        <span className="mt-3 block text-[9px] font-bold tracking-[.3em] text-khaki">IMAGE PENDING</span>
      </div>
      <span className="absolute bottom-4 left-4 text-[9px] uppercase tracking-widest text-white/40">{image.id}</span>
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab' && panel.current) {
        const nodes = [...panel.current.querySelectorAll<HTMLElement>('button,a,input,select,[tabindex]:not([tabindex="-1"])')]
        if (!nodes.length) return
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', handler); previous?.focus() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[92vh] w-full max-w-3xl overflow-auto bg-bone p-6 shadow-2xl md:p-8">
        <button onClick={onClose} aria-label="Close dialog" className="absolute right-4 top-4 z-10 grid size-11 place-items-center bg-white"><X /></button>
        {children}
      </div>
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-wider text-ink/55"><ol className="flex flex-wrap gap-2">{items.map((item, i) => <li key={item.label} className="flex gap-2">{i > 0 && <span>/</span>}{item.to ? <Link className="hover:text-clay" to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>
}

export function SectionHeading({ eyebrow, title, text, align = 'center' }: { eyebrow?: string; title: string; text?: string; align?: 'center' | 'left' }) {
  return <div className={align === 'center' ? 'mx-auto mb-10 max-w-2xl text-center' : 'mb-8'}>{eyebrow && <p className="mb-3 text-xs font-bold tracking-[.2em] text-clay">{eyebrow}</p>}<h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h2>{text && <p className="mt-4 text-ink/65">{text}</p>}</div>
}
