import { guard, json } from './shared.js'

const PIXABAY_URL = 'https://pixabay.com/api/'
const PER_PAGE = 24
const MAX_PAGE = 8
/** Words that say nothing about how a dish looks; dropped when a long recipe title finds no photos. */
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'with', 'without', 'for', 'of', 'in', 'on', 'to', 'my', 'our', 'your', 'easy', 'quick', 'best', 'simple', 'homemade', 'recipe', 'recipes', 'style', 'from', 'de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'y', 'al', 'para', 'por', 'en', 'un', 'una', 'receta', 'casero', 'casera'])
const MAX_PHOTO_BYTES = 8 * 1024 * 1024
/** Pixabay serves its 640 and 1280 px photos from pixabay.com/get/ and its thumbnails from cdn.pixabay.com. */
const IMAGE_HOSTS = ['pixabay.com', 'cdn.pixabay.com']

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

/** Words that end the dish name inside a title ("brownies WITH a hint of coffee"); what follows rarely helps a photo search. */
const CONNECTORS = new Set(['with', 'without', 'in', 'on', 'for', 'from', 'con', 'sin', 'para', 'en', 'al']) // not "and", "y" or "de": they often join the name itself ("mac and cheese", "pastel de chocolate")

/**
 * Searches for a long, specific recipe title ("Double chocolate brownies with a hint of coffee") usually find nothing. So the
 * title is tried as typed, then only the dish name before words like "with" ("double chocolate brownies"), then that name with
 * its leading words dropped one by one ("chocolate brownies", "brownies"). The first version that finds photos wins.
 */
export function queryVariants(raw: string): string[] {
  const typed = raw.trim()
  const words = typed
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const cut = words.findIndex((w, i) => i > 0 && CONNECTORS.has(w))
  const name = (cut > 0 ? words.slice(0, cut) : words).filter((w) => w.length > 1 && !STOP.has(w))
  const rest = words.filter((w) => w.length > 1 && !STOP.has(w))
  const head = name.length ? name : rest
  const out: string[] = [typed]
  const add = (v: string) => {
    if (v.length >= 2 && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v)
  }
  add(head.join(' '))
  for (let i = 1; i < head.length; i++) add(head.slice(i).join(' '))
  return out.slice(0, 5)
}

/**
 * POST /api/photos: finds stock photos for a recipe title on Pixabay. The API key stays on the server; the app then
 * downloads the chosen photo straight from Pixabay's CDN and stores its own copy (Pixabay forbids hotlinking).
 */
export async function handlePhotoSearch(request: Request): Promise<Response> {
  const g = await guard(request, 'none')
  if ('response' in g) return g.response

  const b = typeof g.body === 'object' && g.body !== null ? (g.body as Record<string, unknown>) : {}
  if (typeof b.download === 'string') return downloadPhoto(b.download)

  const key = process.env.PIXABAY_API_KEY
  if (!key) {
    return json(503, { error: 'not_configured', message: 'PIXABAY_API_KEY is not set on the server. Get a free key at pixabay.com/api/docs.' })
  }

  const query = typeof b.query === 'string' ? b.query.trim() : ''
  if (query.length < 2 || query.length > 100) {
    return json(400, { error: 'bad_request', message: 'Search for 2 to 100 characters.' })
  }

  const base = process.env.PIXABAY_BASE_URL || PIXABAY_URL
  const page = Math.min(MAX_PAGE, Math.max(1, Math.floor(typeof b.page === 'number' ? b.page : 1)))
  // Later pages continue the search that already worked (the app sends back the words that found photos).
  const tries = b.exact === true ? [query] : queryVariants(query)
  const custom = Boolean(process.env.PIXABAY_BASE_URL)
  const cdn = custom ? null : IMAGE_HOSTS

  for (const q of tries) {
    let res: Response
    try {
      res = await fetch(
        `${base}?${new URLSearchParams({ key, q, image_type: 'photo', safesearch: 'true', per_page: String(PER_PAGE), page: String(page) })}`,
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
    const obj = typeof data === 'object' && data !== null ? (data as { hits?: unknown; totalHits?: unknown }) : {}
    const list = Array.isArray(obj.hits) ? (obj.hits as PixabayHit[]) : []
    const photos = list.flatMap((p) => {
      const thumb = pixabayUrl(p.webformatURL, cdn)
      const image = pixabayUrl(p.largeImageURL, cdn)
      const pageUrl = pixabayUrl(p.pageURL, custom ? null : ['pixabay.com'])
      if (!thumb || !image || !pageUrl) return []
      return [{ id: String(p.id ?? ''), thumb, image, page: pageUrl, photographer: str(p.user).slice(0, 80), alt: str(p.tags).slice(0, 160) }]
    })
    if (photos.length === 0 && page === 1 && q !== tries[tries.length - 1]) continue // nothing for these words: try simpler ones
    const total = typeof obj.totalHits === 'number' ? obj.totalHits : photos.length
    return json(200, { photos, usedQuery: q, hasMore: photos.length > 0 && total > page * PER_PAGE })
  }
  return json(200, { photos: [], usedQuery: query, hasMore: false })
}

/** Fallback for browsers that cannot download straight from Pixabay: the server fetches the photo and passes the bytes on. */
async function downloadPhoto(raw: string): Promise<Response> {
  const url = pixabayUrl(raw, process.env.PIXABAY_BASE_URL ? null : IMAGE_HOSTS)
  if (!url) return json(400, { error: 'bad_request', message: 'That is not a Pixabay photo address.' })
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: 'error' })
  } catch {
    return json(502, { error: 'provider_unavailable', message: 'Could not download that photo from Pixabay.' })
  }
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || !type.startsWith('image/')) {
    return json(502, { error: 'provider_unavailable', message: `Pixabay did not return a photo (HTTP ${res.status}).` })
  }
  const bytes = await res.arrayBuffer()
  if (bytes.byteLength > MAX_PHOTO_BYTES) return json(502, { error: 'too_large', message: 'That photo is too large.' })
  return new Response(bytes, { status: 200, headers: { 'content-type': type, 'cache-control': 'private, max-age=3600' } })
}
