import type { MarketplaceLinks } from '../types'
import { trackEvent } from '../lib/analytics'
import { useLanguage } from '../state/LanguageContext'

const configs = [
  { key: 'shopee' as const, labelKey: 'shopShopee' as const, className: 'bg-[#ee4d2d] text-white' },
  { key: 'lazada' as const, labelKey: 'shopLazada' as const, className: 'bg-[#0f146d] text-white' },
  { key: 'tiktok' as const, labelKey: 'shopTiktok' as const, className: 'bg-ink text-white' },
]

export function MarketplaceButtons({ links }: { links: MarketplaceLinks }) {
  const { tr } = useLanguage()
  const visible = configs.filter((c) => links[c.key])
  if (!visible.length) return null
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {visible.map((c) => (
        <a
          key={c.key}
          href={links[c.key]}
          target="_blank"
          rel="noreferrer"
          className={`flex min-h-12 items-center justify-center px-4 text-center text-xs font-bold tracking-widest ${c.className}`}
          onClick={() => trackEvent('marketplace_click', { platform: c.key })}
        >
          {tr(c.labelKey)}
        </a>
      ))}
    </div>
  )
}
