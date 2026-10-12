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

export function sectionContent(section: HomeSection): SectionContent {
  return section.content ?? {}
}
