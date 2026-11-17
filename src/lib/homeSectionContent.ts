import type { HomeSection, ImageRef, SectionContent } from '../types'

export const homePlaceholder = (id: string, alt: string, ratio: 'portrait' | 'landscape' = 'landscape'): ImageRef => ({
  id,
  alt,
  width: ratio === 'landscape' ? 1600 : 900,
  height: ratio === 'landscape' ? 900 : 1100,
})

export function sectionImage(content: SectionContent | undefined, fallback: ImageRef): ImageRef {
  if (content?.image?.src) return content.image
  if (content?.image?.id) return { ...fallback, ...content.image, src: content.image.src }
  return fallback
}

export function heroSlides(content: SectionContent | undefined, fallback: ImageRef): ImageRef[] {
  const slides = (content?.images ?? []).filter((image) => image.src)
  if (slides.length) return slides
  const single = sectionImage(content, fallback)
  return single.src ? [single] : [fallback]
}

export function sectionContent(section: HomeSection): SectionContent {
  return section.content ?? {}
}
