import { lookup as dnsLookup } from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib'
import { guard, json } from './shared.js'

const MAX_BYTES = 2_000_000
const MAX_TEXT = 7500
const MAX_REDIRECTS = 4
const TIMEOUT_MS = 12_000

/** Tests run against a server on localhost; production never sets this. */
const allowPrivate = () => process.env.PAGE_FETCH_ALLOW_PRIVATE === '1'

/** True for addresses that must never be fetched on behalf of a stranger's link: loopback, private, link-local, metadata. */
export function isPrivateAddress(addr: string): boolean {
  const v = net.isIP(addr)
  if (v === 4) {
    const [a, b] = addr.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  if (v === 6) {
    const s = addr.toLowerCase()
    if (s === '::' || s === '::1') return true
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s)
    if (mapped) return isPrivateAddress(mapped[1])
    const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(s) // the form URL parsing writes ::ffff:127.0.0.1 in
    if (hex) {
      const hi = parseInt(hex[1], 16)
      const lo = parseInt(hex[2], 16)
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
    }
    return /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith('ff') || s.startsWith('64:ff9b') || s.startsWith('2001:db8')
  }
  return true
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | { address: string; family: number }[], family?: number) => void

/** DNS lookup that refuses private addresses. It is the connection's own lookup, so the address checked is the address used. */
function safeLookup(hostname: string, options: unknown, cb: LookupCb): void {
  const opts = typeof options === 'object' && options !== null ? (options as { all?: boolean }) : {}
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) return cb(err, '')
    const ok = addresses.filter((a) => allowPrivate() || !isPrivateAddress(a.address))
    if (ok.length === 0) return cb(Object.assign(new Error('blocked address'), { code: 'EBLOCKED' }), '')
    if (opts.all) return cb(null, ok)
    cb(null, ok[0].address, ok[0].family)
  })
}

class PageError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface Fetched {
  body: string
  finalUrl: string
}

function decode(buf: Buffer, encoding: string | undefined): Buffer {
  const e = (encoding ?? '').toLowerCase()
  if (e === 'gzip') return gunzipSync(buf)
  if (e === 'br') return brotliDecompressSync(buf)
  if (e === 'deflate') return inflateSync(buf)
  return buf
}

function getOnce(url: URL): Promise<{ status: number; location?: string; body?: Buffer; type: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : http
    const req = mod.request(
      url,
      {
        method: 'GET',
        lookup: safeLookup as never,
        timeout: TIMEOUT_MS,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; recipe-box/1.0; personal recipe reader)',
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'en,es;q=0.8',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          return resolve({ status, location: res.headers.location, type: '' })
        }
        const type = String(res.headers['content-type'] ?? '').toLowerCase()
        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (c: Buffer) => {
          size += c.length
          if (size > MAX_BYTES) {
            req.destroy(new PageError(413, 'too_large', 'That page is too large to read.'))
            return
          }
          chunks.push(c)
        })
        res.on('end', () => {
          try {
            resolve({ status, type, body: decode(Buffer.concat(chunks), String(res.headers['content-encoding'] ?? '')) })
          } catch {
            reject(new PageError(502, 'bad_page', 'The page could not be decoded.'))
          }
        })
        res.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new PageError(504, 'timeout', 'The page took too long to answer.')))
    req.on('error', reject)
    req.end()
  })
}

async function fetchPage(start: string): Promise<Fetched> {
  let url = new URL(start)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new PageError(400, 'bad_url', 'Only http and https links can be read.')
    if (url.username || url.password) throw new PageError(400, 'bad_url', 'Links with a username or password are not read.')
    if (!allowPrivate() && url.port && url.port !== '80' && url.port !== '443') throw new PageError(400, 'bad_url', 'That link uses an unusual port.')
    if (!allowPrivate() && net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ''))) {
      throw new PageError(400, 'bad_url', 'That address cannot be read.')
    }
    let r
    try {
      r = await getOnce(url)
    } catch (e) {
      if (e instanceof PageError) throw e
      const code = (e as NodeJS.ErrnoException).code
      if (code === 'EBLOCKED') throw new PageError(400, 'bad_url', 'That address cannot be read.')
      throw new PageError(502, 'unreachable', 'Could not open that page.')
    }
    if (r.location) {
      if (hop === MAX_REDIRECTS) throw new PageError(502, 'unreachable', 'That link redirects too many times.')
      url = new URL(r.location, url)
      continue
    }
    if (r.status === 401 || r.status === 403 || r.status === 429) throw new PageError(502, 'blocked', 'That site does not allow automatic reading. Copy the recipe text and paste it below instead.')
    if (r.status < 200 || r.status >= 300 || !r.body) throw new PageError(502, 'unreachable', `The page answered with HTTP ${r.status}.`)
    if (!/html|xml|text\/plain/.test(r.type)) throw new PageError(415, 'not_html', 'That link is not a web page.')
    return { body: r.body.toString('utf8'), finalUrl: url.href }
  }
  throw new PageError(502, 'unreachable', 'Could not open that page.')
}

// ---------- reading the page ----------

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' }

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

const clean = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/[ \t\r\f\v ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = []
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1].trim()))
    } catch {
      /* a broken block is skipped */
    }
  }
  return out
}

function findRecipe(node: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 6 || node === null || typeof node !== 'object') return undefined
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n, depth + 1)
      if (r) return r
    }
    return undefined
  }
  const o = node as Record<string, unknown>
  const t = o['@type']
  if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return o
  return findRecipe(o['@graph'], depth + 1) ?? findRecipe(o.mainEntity, depth + 1) ?? findRecipe(o.mainEntityOfPage, depth + 1)
}

const asText = (v: unknown): string => {
  if (typeof v === 'string') return clean(v)
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(', ')
  if (v && typeof v === 'object') return asText((v as Record<string, unknown>).name ?? (v as Record<string, unknown>).text)
  return ''
}

function isoMinutes(v: unknown): string {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(asText(v))
  if (!m) return ''
  const mins = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return mins > 0 ? `${mins} minutes` : ''
}

function steps(v: unknown): string[] {
  if (typeof v === 'string') return clean(v).split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (!Array.isArray(v)) return v && typeof v === 'object' ? steps([v]) : []
  const out: string[] = []
  for (const s of v) {
    if (typeof s === 'string') out.push(clean(s))
    else if (s && typeof s === 'object') {
      const o = s as Record<string, unknown>
      if (Array.isArray(o.itemListElement)) out.push(...steps(o.itemListElement))
      else {
        const t = asText(o.text ?? o.name)
        if (t) out.push(t)
      }
    }
  }
  return out.filter(Boolean)
}

function recipeToText(r: Record<string, unknown>): string {
  const lines: string[] = []
  const name = asText(r.name)
  if (name) lines.push(`Title: ${name}`)
  const desc = asText(r.description)
  if (desc) lines.push(`Description: ${desc}`)
  const yieldText = asText(r.recipeYield)
  if (yieldText) lines.push(`Servings: ${yieldText}`)
  const prep = isoMinutes(r.prepTime)
  if (prep) lines.push(`Prep time: ${prep}`)
  const cook = isoMinutes(r.cookTime)
  if (cook) lines.push(`Cook time: ${cook}`)
  const ing = Array.isArray(r.recipeIngredient) ? r.recipeIngredient : Array.isArray(r.ingredients) ? r.ingredients : []
  const ingredients = ing.map(asText).filter(Boolean)
  if (ingredients.length) lines.push('', 'Ingredients:', ...ingredients.map((i) => `- ${i}`))
  const how = steps(r.recipeInstructions)
  if (how.length) lines.push('', 'Instructions:', ...how.map((s, i) => `${i + 1}. ${s}`))
  return lines.join('\n')
}

/** No structured recipe on the page: keep the readable text, dropping scripts, menus and footers. */
function articleText(html: string): string {
  let h = html.replace(/<(script|style|noscript|svg|template|iframe|nav|footer|header|aside|form)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  const main = /<(main|article)\b[^>]*>([\s\S]*)<\/\1>/i.exec(h)
  if (main && main[2].length > 800) h = main[2]
  h = h.replace(/<\/(p|div|li|h[1-6]|tr|section|br)\s*>|<br\s*\/?>/gi, '\n')
  return clean(h)
}

export function pageToText(html: string): { text: string; title: string; kind: 'recipe' | 'article' } {
  const title = clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').slice(0, 200)
  for (const block of jsonLdBlocks(html)) {
    const r = findRecipe(block)
    if (r) {
      const text = recipeToText(r)
      if (/Ingredients:|Instructions:/.test(text)) return { text: text.slice(0, MAX_TEXT), title, kind: 'recipe' }
    }
  }
  return { text: articleText(html).slice(0, MAX_TEXT), title, kind: 'article' }
}

/**
 * POST /api/page: opens a web page for the app (browsers cannot, because of CORS) and returns the recipe text on it: the
 * structured recipe most food sites embed, or else the readable text. No AI is called. The address is checked so a link
 * can never make the server read something private.
 */
export async function handlePageText(request: Request): Promise<Response> {
  const g = await guard(request, 'none')
  if ('response' in g) return g.response
  const b = typeof g.body === 'object' && g.body !== null ? (g.body as Record<string, unknown>) : {}
  let url: URL
  try {
    url = new URL(typeof b.url === 'string' ? b.url.trim() : '')
  } catch {
    return json(400, { error: 'bad_request', message: 'Enter a full link starting with https://' })
  }
  try {
    const page = await fetchPage(url.href)
    const { text, title, kind } = pageToText(page.body)
    if (text.length < 40) return json(422, { error: 'empty_page', message: 'No readable text found on that page (it may need JavaScript or a login). Copy the recipe text and paste it below instead.' })
    return json(200, { text, title, kind, url: page.finalUrl })
  } catch (e) {
    if (e instanceof PageError) return json(e.status, { error: e.code, message: e.message })
    console.error('page fetch failed:', e instanceof Error ? e.message.slice(0, 200) : 'unknown')
    return json(502, { error: 'unreachable', message: 'Could not open that page.' })
  }
}
