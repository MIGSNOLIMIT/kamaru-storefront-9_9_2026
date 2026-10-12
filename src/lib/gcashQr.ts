import QRCode from 'qrcode'

/** Normalize to digits only (PH mobile, e.g. 09… or 639…). */
export function normalizeGcashNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length >= 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return `63${digits.slice(1)}`
  return digits
}

export async function gcashQrDataUrl(mobileNumber: string): Promise<string | null> {
  const normalized = normalizeGcashNumber(mobileNumber)
  if (normalized.length < 10) return null
  return QRCode.toDataURL(normalized, { width: 256, margin: 2, errorCorrectionLevel: 'M' })
}
