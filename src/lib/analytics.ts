declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let loaded = false

export function initGa4(measurementId?: string) {
  const id = measurementId?.trim() || String(import.meta.env.VITE_GA4_MEASUREMENT_ID ?? '').trim()
  if (!id || loaded || typeof document === 'undefined') return
  loaded = true
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', id, { anonymize_ip: false })
}
