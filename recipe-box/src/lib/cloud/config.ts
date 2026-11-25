import { apiUrl } from '../apiBase'

export interface CloudConfig {
  supabaseUrl: string
  supabaseAnonKey: string
}

const CACHE_KEY = 'recipe-box:cloud-config'

function readCache(): CloudConfig | null {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Partial<CloudConfig> | null
    return v?.supabaseUrl && v.supabaseAnonKey ? { supabaseUrl: v.supabaseUrl, supabaseAnonKey: v.supabaseAnonKey } : null
  } catch {
    return null
  }
}

/**
 * Where this app's cloud accounts live. Asked of our own server (so the Android app needs no rebuild when it changes) and
 * remembered, so signing in state also works when the app starts without internet. Null when accounts are not set up.
 */
export async function loadCloudConfig(): Promise<CloudConfig | null> {
  try {
    const res = await fetch(apiUrl('/api/config'), { cache: 'no-store', signal: AbortSignal.timeout(4000) })
    if (!res.ok) return readCache()
    const body = (await res.json()) as { configured?: boolean; supabaseUrl?: string; supabaseAnonKey?: string }
    if (!body.configured || !body.supabaseUrl || !body.supabaseAnonKey) {
      try {
        localStorage.removeItem(CACHE_KEY)
      } catch {
        /* nothing to forget */
      }
      return null
    }
    const cfg = { supabaseUrl: body.supabaseUrl, supabaseAnonKey: body.supabaseAnonKey }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cfg))
    } catch {
      /* the next start asks again */
    }
    return cfg
  } catch {
    return readCache() // offline
  }
}
