import { guard, json } from './shared.js'

const PEXELS_URL = 'https://api.pexels.com/v1/search'
const PER_PAGE = 12

interface PexelsPhoto {
  id?: unknown
  url?: unknown
  photographer?: unknown
  alt?: unknown
  src?: { medium?: unknown; large?: unknown }
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Only Pexels' own https hosts are passed on, so the app never fetches an address chosen by someone else. */
function pexelsUrl(v: unknown, hosts: string[] | null): string {
  try {
    const u = new URL(str(v))
    if (hosts === null) return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '' // PEXELS_BASE_URL (tests)
    return u.protocol === 'https:' && hosts.includes(u.hostname) ? u.toString() : ''
  } catch {
    return ''
  }
}

/**
 * POST /api/photos: finds stock photos for a recipe title on Pexels. The API key stays on the server; the app then
 * downloads the chosen photo straight from Pexels' CDN and stores its own copy.
 */
export async function handlePhotoSearch(request: Request): Promise<Response> {
  const g = await guard(request, 'none')
  if ('response' in g) return g.response

  const key = process.env.PEXELS_API_KEY
  if (!key) {
    return json(503, { error: 'not_configured', message: 'PEXELS_API_KEY is not set on the server. Get a free key at pexels.com/api.' })
  }

  const b = typeof g.body === 'object' && g.body !== null ? (g.body as Record<string, unknown>) : {}
  const query = typeof b.query === 'string' ? b.query.trim() : ''
  if (query.length < 2 || query.length > 100) {
    return json(400, { error: 'bad_request', message: 'Search for 2 to 100 characters.' })
  }

  const base = process.env.PEXELS_BASE_URL || PEXELS_URL
  let res: Response
  try {
    res = await fetch(`${base}?${new URLSearchParams({ query, per_page: String(PER_PAGE), orientation: 'landscape' })}`, {
      headers: { authorization: key },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return json(502, { error: 'provider_unavailable', message: 'Could not reach Pexels. Try again in a moment.' })
  }
  if (res.status === 401 || res.status === 403) {
    return json(502, { error: 'provider_auth', message: 'Pexels rejected the server\'s API key. Check PEXELS_API_KEY.' })
  }
  if (res.status === 429) {
    return json(429, { error: 'rate_limited', message: 'Pexels search limit reached (200 per hour). Try again later.' })
  }
  if (!res.ok) return json(502, { error: 'provider_unavailable', message: `Pexels answered HTTP ${res.status}.` })

  const data: unknown = await res.json().catch(() => null)
  const list = typeof data === 'object' && data !== null && Array.isArray((data as { photos?: unknown }).photos)
    ? ((data as { photos: PexelsPhoto[] }).photos)
    : []
  const custom = Boolean(process.env.PEXELS_BASE_URL)
  const cdn = custom ? null : ['images.pexels.com']
  const photos = list.flatMap((p) => {
    const thumb = pexelsUrl(p.src?.medium, cdn)
    const image = pexelsUrl(p.src?.large, cdn)
    const page = pexelsUrl(p.url, custom ? null : ['www.pexels.com'])
    if (!thumb || !image || !page) return []
    return [{ id: String(p.id ?? ''), thumb, image, page, photographer: str(p.photographer).slice(0, 80), alt: str(p.alt).slice(0, 160) }]
  })
  return json(200, { photos })
}
