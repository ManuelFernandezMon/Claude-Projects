import type { ImportedRecipe } from '../types'
import { sourceKind } from './url'

const PASSCODE_KEY = 'recipe-box:import-passcode'

export function loadPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function savePasscode(value: string): void {
  try {
    if (value) localStorage.setItem(PASSCODE_KEY, value)
    else localStorage.removeItem(PASSCODE_KEY)
  } catch {
    /* storage unavailable: the user will just retype it */
  }
}

export class ImportError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

/**
 * Best-effort caption lookup through TikTok's public oEmbed endpoint (CORS-enabled).
 * Returns undefined when the video is private/removed, the URL is not TikTok, or the request fails.
 */
export async function fetchTikTokCaption(url: string): Promise<string | undefined> {
  if (sourceKind(url) !== 'tiktok') return undefined
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
    if (!res.ok) return undefined
    const data: unknown = await res.json()
    const title = typeof data === 'object' && data !== null ? (data as { title?: unknown }).title : undefined
    return typeof title === 'string' && title.trim() ? title.trim() : undefined
  } catch {
    return undefined
  }
}

export async function extractRecipe(
  input: { url?: string; text: string; categories: string[] },
  passcode: string,
): Promise<ImportedRecipe | null> {
  let res: Response
  try {
    res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-import-passcode': passcode },
      body: JSON.stringify(input),
    })
  } catch {
    throw new ImportError('Could not reach the server. Importing needs an internet connection.', 'network')
  }
  const body: { recipe?: ImportedRecipe | null; error?: string; message?: string } = await res
    .json()
    .catch(() => ({}))
  if (!res.ok) {
    const fallback =
      res.status === 404
        ? 'The import endpoint was not found. It only exists on Vercel or in `npm run dev`.'
        : `Import failed (HTTP ${res.status}).`
    throw new ImportError(body.message ?? fallback, body.error ?? 'http')
  }
  return body.recipe ?? null
}
