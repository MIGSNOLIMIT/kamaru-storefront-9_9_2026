import type { ImageRef, Product } from '../types'

export function colorOf(product: Product, colorId?: string) {
  if (!colorId) return undefined
  return product.colors.find((color) => color.id === colorId)
}

export function imageForColor(product: Product, colorId?: string): ImageRef {
  if (colorId) {
    const tagged = product.images.find((image) => image.colorId === colorId)
    if (tagged) return tagged
  }
  return product.images[0] ?? { id: `${product.id}-photo`, alt: product.name, width: 900, height: 1100 }
}
