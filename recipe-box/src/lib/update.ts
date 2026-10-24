import { version as APP_VERSION } from '../../package.json'
import { apiUrl } from './apiBase'

/** The version of this build, from package.json. */
export const INSTALLED_VERSION: string = APP_VERSION

const VERSION_RE = /^\d+\.\d+\.\d+$/

/** True when `latest` is a higher version than `current` (both "major.minor.patch"). */
export function isNewer(latest: string, current: string): boolean {
  if (!VERSION_RE.test(latest) || !VERSION_RE.test(current)) return false
  const a = latest.split('.').map(Number)
  const b = current.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

/** Address of the newest Android app, on the deployed site. */
export const apkUrl = (): string => apiUrl('/downloads/recipe-box.apk')

/** Asks the deployed site which version is newest. Resolves to undefined when offline or the answer is not usable. */
export async function fetchLatestVersion(): Promise<string | undefined> {
  try {
    const res = await fetch(`${apiUrl('/version.json')}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!res.ok) return undefined
    const data: unknown = await res.json()
    const v = typeof data === 'object' && data !== null ? (data as { version?: unknown }).version : undefined
    return typeof v === 'string' && VERSION_RE.test(v) ? v : undefined
  } catch {
    return undefined
  }
}

const DISMISSED_KEY = 'recipe-box:update-dismissed'

export function dismissedUpdate(): string | undefined {
  try {
    return localStorage.getItem(DISMISSED_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function dismissUpdate(version: string): void {
  try {
    localStorage.setItem(DISMISSED_KEY, version)
  } catch {
    /* the notice will simply show again next time */
  }
}
