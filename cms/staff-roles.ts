import type { SiteSettings, UserRole } from '../src/types.ts'

export function isStaffRole(role: UserRole) {
  return role === 'admin' || role === 'content' || role === 'orders' || role === 'super_admin'
}

export function isSuperAdmin(role: UserRole) {
  return role === 'super_admin'
}

export function staffDisplayRole(role: UserRole) {
  if (role === 'super_admin') return 'Super admin'
  if (isStaffRole(role)) return 'Editor'
  return role
}

export function mergeSettingsForStaffRole(
  incoming: SiteSettings,
  existing: SiteSettings,
  role: UserRole,
): SiteSettings {
  if (isSuperAdmin(role)) return incoming
  return {
    ...incoming,
    gcashNumber: existing.gcashNumber,
    gcashAccountName: existing.gcashAccountName,
    bankDetails: existing.bankDetails,
    qrImageUrl: existing.qrImageUrl,
  }
}
