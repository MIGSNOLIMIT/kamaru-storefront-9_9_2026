import { useEffect } from 'react'

export function Seo({ title = 'Kamaru Philippines | Durable Bags & Outdoor Gear', description = 'Discover Kamaru Philippines — durable, water-resistant bags designed for everyday life, travel and adventure.', jsonLd }: { title?: string; description?: string; jsonLd?: object }) {
  useEffect(() => {
    document.title = title
    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name'
      let node = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
      if (!node) { node = document.createElement('meta'); node.setAttribute(attr, name); document.head.appendChild(node) }
      node.content = content
    }
    setMeta('description', description)
    setMeta('og:title', title, true)
    setMeta('og:description', description, true)
    setMeta('og:type', 'website', true)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = window.location.href.split('?')[0]
    let script = document.head.querySelector<HTMLScriptElement>('#page-jsonld')
    if (!script) { script = document.createElement('script'); script.id = 'page-jsonld'; script.type = 'application/ld+json'; document.head.appendChild(script) }
    script.textContent = JSON.stringify(jsonLd ?? { '@context': 'https://schema.org', '@type': 'Organization', name: 'KAMARU Philippines', url: window.location.origin })
  }, [title, description, jsonLd])
  return null
}
