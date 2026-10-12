import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Breadcrumbs, Button, Media } from '../components/UI'
import { formatPrice } from '../components/Product'
import { useSiteSettings } from '../hooks/useContent'
import { useAuth } from '../state/AuthContext'
import { useStore } from '../state/StoreContext'
import { useLanguage } from '../state/LanguageContext'
import { commerceApi } from '../lib/commerceApi'
import { trackEvent } from '../lib/analytics'
import { gcashQrDataUrl } from '../lib/gcashQr'
import type { FulfillmentMethod, PaymentMethod, SiteSettings } from '../types'
import { Seo } from '../components/Seo'

const fieldClass = 'min-h-12 w-full border border-ink/20 px-4 font-normal tracking-normal'

function GcashPaymentBlock({ settings }: { settings: SiteSettings }) {
  const [generatedQr, setGeneratedQr] = useState<string | null>(null)

  useEffect(() => {
    if (settings.qrImageUrl || !settings.gcashNumber?.trim()) {
      setGeneratedQr(null)
      return
    }
    let cancelled = false
    void gcashQrDataUrl(settings.gcashNumber)
      .then((url) => {
        if (!cancelled) setGeneratedQr(url)
      })
      .catch(() => {
        if (!cancelled) setGeneratedQr(null)
      })
    return () => {
      cancelled = true
    }
  }, [settings.gcashNumber, settings.qrImageUrl])

  const qrSrc = settings.qrImageUrl ?? generatedQr

  return (
    <div className="space-y-3 text-center text-sm">
      {qrSrc ? (
        <img src={qrSrc} alt="GCash payment QR" className="mx-auto max-h-52 w-52 max-w-full rounded border border-ink/10 bg-white p-2" />
      ) : (
        <p className="text-ink/55">GCash QR will appear once a GCash number is configured in CMS.</p>
      )}
      {(settings.gcashAccountName || settings.gcashNumber) && (
        <dl className="text-left">
          {settings.gcashAccountName ? (
            <>
              <dt className="font-bold">GCash account name</dt>
              <dd>{settings.gcashAccountName}</dd>
            </>
          ) : null}
          {settings.gcashNumber ? (
            <>
              <dt className="mt-2 font-bold">GCash mobile number</dt>
              <dd>{settings.gcashNumber}</dd>
            </>
          ) : null}
        </dl>
      )}
      {!settings.qrImageUrl && settings.gcashNumber ? (
        <p className="text-xs text-ink/45">Scan to send to this GCash number. For official merchant QR, upload an image in CMS (Super admin).</p>
      ) : null}
    </div>
  )
}

export default function Checkout() {
  const { user, isAuthenticated } = useAuth()
  const { cart, clearCart } = useStore()
  const { data: settings } = useSiteSettings()
  const { tr } = useLanguage()
  const [companyName, setCompanyName] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qr')
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('lbc')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneId, setDoneId] = useState('')
  const moq = settings?.bulkMoq

  if (!isAuthenticated) return <Navigate to={`/account?next=${encodeURIComponent('/checkout')}`} replace />
  if (!cart.length && !doneId) {
    return (
      <div className="container-site section-space text-center">
        <h1 className="text-4xl font-extrabold">Bulk checkout</h1>
        <p className="mt-4 text-ink/60">Your bulk cart is empty.</p>
        <Link to="/shop" className="mt-6 inline-block"><Button>Shop products</Button></Link>
      </div>
    )
  }

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.quantity, 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (moq && cart.some((line) => line.quantity < moq)) {
      setError(`Each line must be at least ${moq} units for bulk orders.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      let paymentProofUrl: string | undefined
      if (paymentMethod !== 'pickup' && proofFile) {
        paymentProofUrl = await commerceApi.uploadPaymentProof(proofFile, user.id)
      }
      const order = await commerceApi.createOrder({
        userId: user.id,
        items: cart.map((line) => ({
          productId: line.product.id,
          productName: line.product.name,
          productSlug: line.product.slug,
          colorId: line.colorId,
          quantity: line.quantity,
          unitPrice: line.product.price,
        })),
        companyName: companyName || undefined,
        deliveryAddress: fulfillmentMethod === 'pickup' ? undefined : deliveryAddress,
        paymentMethod,
        fulfillmentMethod,
        paymentProofUrl,
        customerNotes: customerNotes || undefined,
        subtotal,
      })
      trackEvent('purchase', { transaction_id: order.id, value: subtotal, currency: 'PHP' })
      clearCart()
      setDoneId(order.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  if (doneId) {
    return (
      <div className="container-site section-space max-w-2xl">
        <Seo title="Order received | Kamaru" />
        <h1 className="text-4xl font-extrabold">Bulk order received</h1>
        <p className="mt-4 leading-7 text-ink/65">Reference: {doneId}. Our team will review your order and contact you for fulfillment via {fulfillmentMethod === 'pickup' ? 'pickup and face-to-face payment' : 'LBC or Lalamove'}.</p>
        <Link to="/account" className="mt-8 inline-block"><Button>View account</Button></Link>
      </div>
    )
  }

  return (
    <div className="container-site section-space">
      <Seo title="Bulk checkout | Kamaru" />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Bulk checkout' }]} />
      <h1 className="my-8 text-4xl font-extrabold md:text-5xl">BULK CHECKOUT</h1>
      {moq ? <p className="mb-6 text-sm text-ink/60">Minimum {moq} units per product line.</p> : null}
      {error && <p className="mb-6 border border-clay/30 bg-clay/5 p-4 text-sm text-clay">{error}</p>}
      <form onSubmit={(e) => void submit(e)} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <div className="min-w-0 space-y-6 bg-white p-6 md:p-8">
          <Field label="Company name (optional)"><input className={fieldClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></Field>
          <Field label="Delivery address">
            <textarea className={fieldClass} rows={3} required={fulfillmentMethod !== 'pickup'} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} disabled={fulfillmentMethod === 'pickup'} />
          </Field>
          <Field label="Notes for Kamaru"><textarea className={fieldClass} rows={3} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} /></Field>
          <Field label="Fulfillment">
            <select className={fieldClass} value={fulfillmentMethod} onChange={(e) => setFulfillmentMethod(e.target.value as FulfillmentMethod)}>
              <option value="lbc">Ship via LBC (manual)</option>
              <option value="lalamove">Ship via Lalamove (manual)</option>
              <option value="pickup">Pickup at outlet (pay face to face)</option>
            </select>
          </Field>
          <Field label="Payment">
            <select className={fieldClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              <option value="qr">QR payment</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="pickup">Pay on pickup</option>
            </select>
          </Field>
          {paymentMethod !== 'pickup' && (
            <div className="space-y-4 border border-ink/10 p-4">
              {paymentMethod === 'qr' && settings ? <GcashPaymentBlock settings={settings} /> : null}
              {settings?.bankDetails && paymentMethod === 'bank_transfer' && (
                <dl className="text-sm">
                  <dt className="font-bold">Bank</dt><dd>{settings.bankDetails.bankName}</dd>
                  <dt className="mt-2 font-bold">Account name</dt><dd>{settings.bankDetails.accountName}</dd>
                  <dt className="mt-2 font-bold">Account number</dt><dd>{settings.bankDetails.accountNumber}</dd>
                </dl>
              )}
              <Field label="Upload payment proof">
                <input type="file" accept="image/*" className={fieldClass} onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} required />
                {proofFile && <p className="mt-2 text-xs text-ink/55">Selected: {proofFile.name}</p>}
              </Field>
            </div>
          )}
        </div>
        <aside className="h-fit min-w-0 overflow-hidden rounded-sm bg-ink p-6 text-white lg:sticky lg:top-24">
          <h2 className="text-xl font-extrabold">{tr('bulkCartTitle')}</h2>
          <ul className="mt-5 space-y-4">
            {cart.map((line) => (
              <li key={`${line.product.id}-${line.colorId}`} className="flex gap-3">
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-sm bg-white/10">
                  <Media compact image={line.product.images[0]} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-bold">{line.product.name}</p>
                  <p className="text-white/55">Qty {line.quantity}</p>
                  <p className="font-semibold">{formatPrice(line.product.price * line.quantity)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-between border-t border-white/15 pt-4 text-sm font-bold">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <Button type="submit" className="mt-6 w-full" disabled={busy}>{busy ? 'Submitting…' : 'Submit bulk order'}</Button>
        </aside>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold tracking-wider">
      {label.toUpperCase()}
      <div className="mt-2">{children}</div>
    </label>
  )
}
