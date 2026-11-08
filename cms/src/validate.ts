export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function isOptionalUrl(value?: string) {
  if (!value?.trim()) return true
  return /^(https?:\/\/|\/)/.test(value.trim())
}

export function isMoney(value: number) {
  return Number.isFinite(value) && value >= 0
}
