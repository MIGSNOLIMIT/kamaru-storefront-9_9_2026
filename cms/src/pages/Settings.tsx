import { useEffect, useState } from 'react'
import type { SiteSettings } from '../../../src/types'
import { api } from '../api'
import { ImageField } from '../components/ImageField'
import { Button, Card, Field, Input, Notice, PageHeader, Textarea } from '../ui'
import { useStaffAuth } from '../state/StaffAuth'

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <p className="min-h-12 border border-ink/10 bg-ink/[0.03] px-4 py-3 text-sm">{value || '—'}</p>
    </Field>
  )
}

export function Settings() {
  const { staff } = useStaffAuth()
  const canEditPayment = staff?.role === 'super_admin'
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void api.snapshot().then((data) => setSettings(data.siteSettings)).catch((e: Error) => setError(e.message))
  }, [])

  if (error && !settings) return <Notice>{error}</Notice>
  if (!settings) return <p className="text-sm text-ink/50">Loading settings…</p>

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setSettings({ ...settings, [key]: value })
  const bank = settings.bankDetails ?? { bankName: '', accountName: '', accountNumber: '', branch: '' }
  const stores = settings.marketplaceStores ?? {}

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      setSettings(await api.saveSettings(settings))
      setSaved('Settings saved. Refresh the storefront to see updates.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader kicker="Site" title="Settings">
        <Button type="button" disabled={busy} onClick={() => void save()}>Save settings</Button>
      </PageHeader>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {saved && <p className="mb-5 text-sm text-olive">{saved}</p>}
      <Card className="grid max-w-3xl gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Brand name"><Input value={settings.brandName} onChange={(e) => set('brandName', e.target.value)} /></Field>
          <Field label="Tagline"><Input value={settings.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={settings.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Inquiry inbox email"><Input type="email" value={settings.inquiryEmail} onChange={(e) => set('inquiryEmail', e.target.value)} /></Field>
          <Field label="Fax"><Input value={settings.fax} onChange={(e) => set('fax', e.target.value)} /></Field>
          <Field label="Bulk MOQ (optional)"><Input type="number" min={1} value={settings.bulkMoq ?? ''} onChange={(e) => set('bulkMoq', e.target.value ? Number(e.target.value) : undefined)} /></Field>
          <Field label="GA4 measurement ID"><Input value={settings.ga4MeasurementId ?? ''} onChange={(e) => set('ga4MeasurementId', e.target.value || undefined)} /></Field>
        </div>
        <Field label="Phones (one per line)"><Textarea rows={3} value={settings.phones.join('\n')} onChange={(e) => set('phones', e.target.value.split('\n').map((line) => line.trim()).filter(Boolean))} /></Field>
        <Field label="Address"><Textarea rows={3} value={settings.address} onChange={(e) => set('address', e.target.value)} /></Field>

        <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">PAYMENT DETAILS (BULK CHECKOUT)</p>
        {!canEditPayment && (
          <p className="text-xs text-ink/55">View only. Only a Super admin can change GCash and bank details.</p>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          {canEditPayment ? (
            <>
              <Field label="GCash mobile number">
                <Input value={settings.gcashNumber ?? ''} onChange={(e) => set('gcashNumber', e.target.value || undefined)} placeholder="09XX XXX XXXX" />
              </Field>
              <Field label="GCash account name">
                <Input value={settings.gcashAccountName ?? ''} onChange={(e) => set('gcashAccountName', e.target.value || undefined)} />
              </Field>
              <div className="md:col-span-2">
                <ImageField
                  label="Official GCash QR image (optional — overrides auto-generated QR)"
                  image={{ id: 'qr-payment', alt: 'QR payment', width: 400, height: 400, src: settings.qrImageUrl }}
                  onChange={(img) => set('qrImageUrl', img.src)}
                />
              </div>
            </>
          ) : (
            <>
              <ReadOnlyValue label="GCash mobile number" value={settings.gcashNumber ?? ''} />
              <ReadOnlyValue label="GCash account name" value={settings.gcashAccountName ?? ''} />
              <ReadOnlyValue label="QR image URL" value={settings.qrImageUrl ?? ''} />
            </>
          )}
        </div>
        <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">BANK DETAILS (BULK TRANSFER)</p>
        <div className="grid gap-5 md:grid-cols-2">
          {canEditPayment ? (
            <>
              <Field label="Bank name"><Input value={bank.bankName} onChange={(e) => set('bankDetails', { ...bank, bankName: e.target.value })} /></Field>
              <Field label="Account name"><Input value={bank.accountName} onChange={(e) => set('bankDetails', { ...bank, accountName: e.target.value })} /></Field>
              <Field label="Account number"><Input value={bank.accountNumber} onChange={(e) => set('bankDetails', { ...bank, accountNumber: e.target.value })} /></Field>
              <Field label="Branch"><Input value={bank.branch ?? ''} onChange={(e) => set('bankDetails', { ...bank, branch: e.target.value || undefined })} /></Field>
            </>
          ) : (
            <>
              <ReadOnlyValue label="Bank name" value={bank.bankName} />
              <ReadOnlyValue label="Account name" value={bank.accountName} />
              <ReadOnlyValue label="Account number" value={bank.accountNumber} />
              <ReadOnlyValue label="Branch" value={bank.branch ?? ''} />
            </>
          )}
        </div>

        <p className="text-[10px] font-bold tracking-[.16em] text-ink/55">MARKETPLACE STORE URLS</p>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Shopee store"><Input value={stores.shopee ?? ''} onChange={(e) => set('marketplaceStores', { ...stores, shopee: e.target.value || undefined })} /></Field>
          <Field label="Lazada store"><Input value={stores.lazada ?? ''} onChange={(e) => set('marketplaceStores', { ...stores, lazada: e.target.value || undefined })} /></Field>
          <Field label="TikTok store"><Input value={stores.tiktok ?? ''} onChange={(e) => set('marketplaceStores', { ...stores, tiktok: e.target.value || undefined })} /></Field>
        </div>
        {settings.social.map((item, index) => (
          <div key={item.label} className="grid gap-5 md:grid-cols-2">
            <Field label="Social label"><Input value={item.label} onChange={(e) => set('social', settings.social.map((s, i) => i === index ? { ...s, label: e.target.value } : s))} /></Field>
            <Field label="Social URL"><Input value={item.href} onChange={(e) => set('social', settings.social.map((s, i) => i === index ? { ...s, href: e.target.value } : s))} /></Field>
          </div>
        ))}
      </Card>
    </div>
  )
}
