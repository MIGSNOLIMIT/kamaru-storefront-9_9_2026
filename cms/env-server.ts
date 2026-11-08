import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

let loaded = false

export function loadServerEnv() {
  if (loaded) return
  loaded = true
  const envPath = path.join(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

export function supabaseServiceConfig() {
  loadServerEnv()
  const url = String(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim()
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  const anonKey = String(process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '').trim()
  return { url, serviceKey, anonKey, configured: Boolean(url && serviceKey) }
}
