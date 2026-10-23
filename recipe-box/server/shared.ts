import { createHash, timingSafeEqual } from 'node:crypto'
import { callAnthropic, mapAnthropicError } from './anthropicProvider.js'
import { callGemini, mapGeminiError } from './geminiProvider.js'
import type { ProviderName, ProviderRequest, ProviderResult } from './schema.js'

type Json = Record<string, unknown>

export function json(status: number, body: Json): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
}

/**
 * The Android app (a Capacitor WebView) calls these endpoints cross-origin from https://localhost. Only those origins are allowed,
 * plus any listed in CORS_ALLOWED_ORIGINS (comma-separated; used by tests). Auth is the passcode header, not cookies.
 */
const APP_ORIGINS = ['https://localhost', 'capacitor://localhost', 'http://localhost']

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  const extra = (process.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)
  return [...APP_ORIGINS, ...extra].includes(origin) ? origin : null
}

/** Wraps an endpoint: answers CORS preflights and adds CORS headers to every response for allowed origins. */
export function withCors(handler: (request: Request) => Promise<Response>): (request: Request) => Promise<Response> {
  return async (request) => {
    const origin = allowedOrigin(request)
    if (request.method === 'OPTIONS') {
      const headers = new Headers({ vary: 'Origin', 'cache-control': 'no-store' })
      if (origin) {
        headers.set('access-control-allow-origin', origin)
        headers.set('access-control-allow-methods', 'POST, OPTIONS')
        headers.set('access-control-allow-headers', 'content-type, x-import-passcode')
        headers.set('access-control-max-age', '86400')
      }
      return new Response(null, { status: 204, headers })
    }
    const res = await handler(request)
    if (!origin) return res
    const headers = new Headers(res.headers)
    headers.set('access-control-allow-origin', origin)
    headers.append('vary', 'Origin')
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  }
}

function sameSecret(a: string, b: string): boolean {
  // Hash first so the comparison is constant-time regardless of length.
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/** Stops untrusted text from closing or opening the XML-style wrappers used in prompts. */
export function neutralize(value: string): string {
  return value.replace(/<(\/?)(caption|existing_categories|source_url|request|current_recipe)/gi, '‹$1$2')
}

export function cleanCategories(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((c): c is string => typeof c === 'string').map((c) => c.slice(0, 60)).slice(0, 50)
    : []
}

const hasAnthropicKey = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
const hasGeminiKey = () => !!process.env.GEMINI_API_KEY

/**
 * AI_PROVIDER=anthropic|gemini picks explicitly. When unset: Anthropic if its key exists, else Gemini if its key exists.
 * Returns an error message when nothing usable is configured.
 */
export function resolveProvider(): { provider: ProviderName } | { error: string } {
  const wanted = (process.env.AI_PROVIDER ?? '').trim().toLowerCase()
  if (wanted && wanted !== 'anthropic' && wanted !== 'gemini') {
    return { error: 'AI_PROVIDER must be "anthropic" or "gemini".' }
  }
  if (wanted === 'anthropic') {
    return hasAnthropicKey() ? { provider: 'anthropic' } : { error: 'ANTHROPIC_API_KEY is not set on the server.' }
  }
  if (wanted === 'gemini') {
    return hasGeminiKey() ? { provider: 'gemini' } : { error: 'GEMINI_API_KEY is not set on the server.' }
  }
  if (hasAnthropicKey()) return { provider: 'anthropic' }
  if (hasGeminiKey()) return { provider: 'gemini' }
  return { error: 'No AI key is set on the server (GEMINI_API_KEY or ANTHROPIC_API_KEY).' }
}

/**
 * Common gate for every AI endpoint: POST only, server configured, passcode correct.
 * `needs: 'gemini'` is for video, which only Gemini can read. Returns an error Response, or null when allowed.
 */
export function authorize(request: Request, needs?: 'gemini'): Response | null {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed', message: 'Use POST.' })
  const passcode = process.env.RECIPE_IMPORT_PASSCODE
  if (!passcode) return json(503, { error: 'not_configured', message: 'RECIPE_IMPORT_PASSCODE is not set on the server.' })
  if (needs === 'gemini') {
    if (!hasGeminiKey()) {
      return json(503, { error: 'not_configured', message: 'GEMINI_API_KEY is not set on the server (video understanding uses Gemini).' })
    }
  } else {
    const resolved = resolveProvider()
    if ('error' in resolved) return json(503, { error: 'not_configured', message: resolved.error })
  }
  if (!sameSecret(request.headers.get('x-import-passcode') ?? '', passcode)) {
    return json(401, { error: 'unauthorized', message: 'Wrong or missing passcode.' })
  }
  return null
}

/** `authorize` plus a JSON body. Returns the parsed body, or a ready-made error Response. */
export async function guard(request: Request, needs?: 'gemini'): Promise<{ body: unknown } | { response: Response }> {
  const denied = authorize(request, needs)
  if (denied) return { response: denied }
  try {
    return { body: await request.json() }
  } catch {
    return { response: json(400, { error: 'bad_request', message: 'Body must be valid JSON.' }) }
  }
}

/** Calls the configured provider for a structured recipe and maps the outcome to an HTTP response. */
export async function runRecipeModel(
  opts: ProviderRequest & { categories: string[]; provider?: ProviderName; started?: number },
): Promise<Response> {
  let provider: ProviderName
  if (opts.provider) {
    provider = opts.provider
  } else {
    const resolved = resolveProvider()
    if ('error' in resolved) return json(503, { error: 'not_configured', message: resolved.error })
    provider = resolved.provider
  }

  let result: ProviderResult
  try {
    result = provider === 'gemini' ? await callGemini(opts, opts.started) : await callAnthropic(opts)
  } catch (e) {
    console.error('AI request failed:', provider, e instanceof Error ? e.name : 'unknown', (e as { status?: number }).status ?? '', e instanceof Error ? e.message.slice(0, 300) : '')
    const m = provider === 'gemini' ? mapGeminiError(e) : mapAnthropicError(e)
    return json(m.status, { error: m.error, message: m.message })
  }

  if (result.kind === 'refused') {
    return json(422, { error: 'refused', message: 'The model declined to process this request.' })
  }
  if (result.kind === 'bad_output') {
    return json(502, { error: 'bad_model_output', message: 'The model returned an unreadable result. Try again.' })
  }
  const out = result.out
  if (!out.is_recipe) return json(200, { recipe: null })

  const allowed = new Map(opts.categories.map((c) => [c.toLowerCase(), c]))
  return json(200, {
    provider,
    recipe: {
      title: out.title.trim().slice(0, 200),
      description: out.description.trim().slice(0, 2000),
      ingredients: out.ingredients
        .map((i) => ({ quantity: i.quantity.trim().slice(0, 60), name: i.name.trim().slice(0, 200) }))
        .filter((i) => i.name)
        .slice(0, 100),
      steps: out.steps.map((s) => s.trim().slice(0, 1000)).filter(Boolean).slice(0, 100),
      prepMinutes: out.prep_minutes && out.prep_minutes > 0 ? Math.round(out.prep_minutes) : null,
      cookMinutes: out.cook_minutes && out.cook_minutes > 0 ? Math.round(out.cook_minutes) : null,
      servings: out.servings && out.servings > 0 ? Math.round(out.servings) : null,
      categoryNames: out.category_names.flatMap((n) => allowed.get(n.toLowerCase()) ?? []),
    },
  })
}
