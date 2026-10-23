import type { ImportedRecipe } from '../types'
import { apiUrl } from './apiBase'
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
  /** Technical detail shown in small print, to make failures on a phone diagnosable. */
  readonly detail?: string
  constructor(message: string, code: string, detail?: string) {
    super(message)
    this.code = code
    this.detail = detail
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

/** Like postAi, but also returns the model's one-line reason when it found no recipe. */
export async function postAiDetailed(
  endpoint: string,
  payload: unknown,
  passcode: string,
): Promise<{ recipe: ImportedRecipe | null; reason?: string }> {
  let res: Response
  try {
    res = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-import-passcode': passcode },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new ImportError('Could not reach the server. This feature needs an internet connection.', 'network')
  }
  const body: { recipe?: ImportedRecipe | null; reason?: string; error?: string; message?: string } = await res
    .json()
    .catch(() => ({}))
  if (!res.ok) {
    const fallback =
      res.status === 404
        ? 'The AI endpoint was not found. It only exists on Vercel or in `npm run dev`.'
        : `Request failed (HTTP ${res.status}).`
    throw new ImportError(body.message ?? fallback, body.error ?? 'http')
  }
  return { recipe: body.recipe ?? null, ...(typeof body.reason === 'string' && body.reason ? { reason: body.reason } : {}) }
}

export async function postAi(endpoint: string, payload: unknown, passcode: string): Promise<ImportedRecipe | null> {
  return (await postAiDetailed(endpoint, payload, passcode)).recipe
}

/** Asks the AI for metric and US versions of each amount. Resolves to one entry per ingredient, in the same order. */
export async function convertIngredients(
  ingredients: { quantity: string; name: string }[],
  passcode: string,
): Promise<ImportedRecipe['ingredients']> {
  const r = await postAi('/api/convert', { ingredients }, passcode)
  if (!r) throw new ImportError('The AI could not convert these measurements. Try again.', 'no_result')
  return r.ingredients
}

export function extractRecipe(
  input: { url?: string; text: string; categories: string[] },
  passcode: string,
): Promise<ImportedRecipe | null> {
  return postAi('/api/extract', input, passcode)
}

export function generateRecipe(
  input: { prompt: string; previous?: ImportedRecipe; categories: string[] },
  passcode: string,
): Promise<ImportedRecipe | null> {
  return postAi('/api/generate', input, passcode)
}
