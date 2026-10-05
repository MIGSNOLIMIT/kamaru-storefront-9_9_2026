import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../adminApi'
import { api, formatPrice, storefrontUrl, type Snapshot } from '../api'
import { useStaffAuth } from '../state/StaffAuth'
import { Button, Card, Notice, PageHeader } from '../ui'

export function Dashboard() {
  const { token } = useStaffAuth()
  const [data, setData] = useState<Snapshot | null>(null)
  const [orderCount, setOrderCount] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api.snapshot().then(setData).catch((e: Error) => setError(e.message))
  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!token) return
    void adminApi.orders(token).then((orders) => setOrderCount(orders.length)).catch(() => setOrderCount(0))
  }, [token])

  const reset = async () => {
    if (!confirm('Reset CMS content back to the original storefront catalog?')) return
    setBusy(true)
    try {
      setData(await api.reset())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <p className="text-sm text-ink/50">{error || 'Loading current catalog…'}</p>

  const published = data.products.filter((p) => p.status === 'published')
  const stats = [
    [String(data.products.length), 'Products', `${published.length} published`, '/products'],
    [String(data.categories.length), 'Categories', `${data.categories.filter((c) => !c.parentId).length} top level`, '/categories'],
    [String(data.articles.length), 'Journal posts', `${data.articles.filter((a) => a.status === 'published').length} published`, '/articles'],
    [String(data.homeSections.length), 'Homepage blocks', 'Live section order', '/homepage'],
    [String(orderCount), 'Bulk orders', 'Payment review inbox', '/orders'],
  ] as const

  return (
    <div>
      <PageHeader kicker="Current setup" title="Kamaru content studio">
        <div className="flex gap-2">
          <a href={storefrontUrl} target="_blank" rel="noreferrer"><Button type="button">View storefront</Button></a>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void reset()}>Reset to seed</Button>
        </div>
      </PageHeader>
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}
      <p className="mb-6 max-w-2xl text-sm leading-6 text-ink/60">
        This CMS is seeded with the current Kamaru catalog, journal, homepage sections, and site settings.
        Published changes are what the storefront reads at <span className="font-semibold text-ink">{storefrontUrl}</span>.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([value, label, detail, to]) => (
          <Link key={label} to={to}><Card className="transition hover:shadow-md"><p className="font-display text-4xl font-extrabold">{value}</p><p className="mt-2 text-xs font-bold tracking-[.14em]">{label.toUpperCase()}</p><p className="mt-1 text-xs text-ink/50">{detail}</p></Card></Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-sm font-extrabold tracking-[.12em]">HOMEPAGE ORDER</h2>
          <ol className="mt-4 space-y-2 text-sm">
            {[...data.homeSections].sort((a, b) => a.sortOrder - b.sortOrder).map((section, i) => (
              <li key={section.id} className="flex justify-between border-b border-ink/10 py-2">
                <span>{i + 1}. {section.type.replaceAll('-', ' ')}</span>
                <span className="text-ink/40">{section.id}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2 className="text-sm font-extrabold tracking-[.12em]">SITE SETTINGS</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-[10px] font-bold tracking-widest text-ink/40">BRAND</dt><dd className="font-bold">{data.siteSettings.brandName} — {data.siteSettings.tagline}</dd></div>
            <div><dt className="text-[10px] font-bold tracking-widest text-ink/40">CONTACT</dt><dd>{data.siteSettings.email}<br />{data.siteSettings.phones.join(' · ')}</dd></div>
            <div><dt className="text-[10px] font-bold tracking-widest text-ink/40">ADDRESS</dt><dd>{data.siteSettings.address}</dd></div>
          </dl>
        </Card>
      </div>
      <Card className="mt-6 overflow-x-auto">
        <h2 className="text-sm font-extrabold tracking-[.12em]">CATALOG SNAPSHOT</h2>
        <table className="mt-4 w-full min-w-[640px] text-left text-sm">
          <thead className="text-[10px] tracking-[.14em] text-ink/40"><tr><th className="pb-3">PRODUCT</th><th className="pb-3">PRICE</th><th className="pb-3">STATUS</th><th className="pb-3">FLAGS</th></tr></thead>
          <tbody>
            {data.products.slice(0, 8).map((product) => (
              <tr key={product.id} className="border-t border-ink/10">
                <td className="py-3 font-bold"><Link className="hover:text-clay" to={`/products/${product.id}`}>{product.name}</Link></td>
                <td>{formatPrice(product.price)}</td>
                <td className="uppercase">{product.status}</td>
                <td className="text-xs text-ink/50">{[product.flags.featured && 'Featured', product.flags.newArrival && 'New', product.flags.bestSeller && 'Best seller'].filter(Boolean).join(' · ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link to="/products" className="mt-4 inline-block text-xs font-bold tracking-widest underline">View all products</Link>
      </Card>
    </div>
  )
}
