import { guard, json } from './shared.js'

const PIXABAY_URL = 'https://pixabay.com/api/'
const PER_PAGE = 12

interface PixabayHit {
  id?: unknown
  pageURL?: unknown
  user?: unknown
  tags?: unknown
  webformatURL?: unknown
  largeImageURL?: unknown
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Only Pixabay's own https hosts are passed on, so the app never fetches an address chosen by someone else. */
function pixabayUrl(v: unknown, hosts: string[] | null): string {
  try {
    const u = new URL(str(v))
    if (hosts === null) return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '' // PIXABAY_BASE_URL (tests)
    return u.protocol === 'https:' && hosts.includes(u.hostname) ? u.toString() : ''
  } catch {
    return ''
  }
}

/**
 * POST /api/photos: finds stock photos for a recipe title on Pixabay. The API key stays on the server; the app then
 * downloads the chosen photo straight from Pixabay's CDN and stores its own copy (Pixabay forbids hotlinking).
 */
export async function handlePhotoSearch(request: Request): Promise<Response> {
  const g = await guard(request, 'none')
  if ('response' in g) return g.response

  const key = process.env.PIXABAY_API_KEY
  if (!key) {
    return json(503, { error: 'not_configured', message: 'PIXABAY_API_KEY is not set on the server. Get a free key at pixabay.com/api/docs.' })
  }

  const b = typeof g.body === 'object' && g.body !== null ? (g.body as Record<string, unknown>) : {}
  const query = typeof b.query === 'string' ? b.query.trim() : ''
  if (query.length < 2 || query.length > 100) {
    return json(400, { error: 'bad_request', message: 'Search for 2 to 100 characters.' })
  }

  const base = process.env.PIXABAY_BASE_URL || PIXABAY_URL
  let res: Response
  try {
    res = await fetch(
      `${base}?${new URLSearchParams({ key, q: query, image_type: 'photo', orientation: 'horizontal', safesearch: 'true', per_page: String(PER_PAGE) })}`,
      { signal: AbortSignal.timeout(15_000) },
    )
  } catch {
    return json(502, { error: 'provider_unavailable', message: 'Could not reach Pixabay. Try again in a moment.' })
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return json(502, { error: 'provider_auth', message: "Pixabay rejected the server's API key. Check PIXABAY_API_KEY." })
  }
  if (res.status === 429) {
    return json(429, { error: 'rate_limited', message: 'Pixabay search limit reached (100 per minute). Try again in a minute.' })
  }
  if (!res.ok) return json(502, { error: 'provider_unavailable', message: `Pixabay answered HTTP ${res.status}.` })

  const data: unknown = await res.json().catch(() => null)
  const list =
    typeof data === 'object' && data !== null && Array.isArray((data as { hits?: unknown }).hits)
      ? (data as { hits: PixabayHit[] }).hits
      : []
  const custom = Boolean(process.env.PIXABAY_BASE_URL)
  const cdn = custom ? null : ['cdn.pixabay.com']
  const photos = list.flatMap((p) => {
    const thumb = pixabayUrl(p.webformatURL, cdn)
    const image = pixabayUrl(p.largeImageURL, cdn)
    const page = pixabayUrl(p.pageURL, custom ? null : ['pixabay.com'])
    if (!thumb || !image || !page) return []
    return [{ id: String(p.id ?? ''), thumb, image, page, photographer: str(p.user).slice(0, 80), alt: str(p.tags).slice(0, 160) }]
  })
  return json(200, { photos })
}
