import { createHash, timingSafeEqual } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

export const RecipeOutputSchema = z.object({
  is_recipe: z.boolean(),
  title: z.string(),
  description: z.string(),
  ingredients: z.array(z.object({ quantity: z.string(), name: z.string() })),
  steps: z.array(z.string()),
  prep_minutes: z.number().nullable(),
  cook_minutes: z.number().nullable(),
  servings: z.number().nullable(),
  category_names: z.array(z.string()),
})

type Json = Record<string, unknown>

export function json(status: number, body: Json): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
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

/**
 * Common gate for every AI endpoint: POST only, server configured, passcode correct, body is JSON.
 * Returns the parsed body, or a ready-made error Response.
 */
export async function guard(request: Request): Promise<{ body: unknown } | { response: Response }> {
  if (request.method !== 'POST') {
    return { response: json(405, { error: 'method_not_allowed', message: 'Use POST.' }) }
  }
  const passcode = process.env.RECIPE_IMPORT_PASSCODE
  if (!passcode) {
    return { response: json(503, { error: 'not_configured', message: 'RECIPE_IMPORT_PASSCODE is not set on the server.' }) }
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return { response: json(503, { error: 'not_configured', message: 'ANTHROPIC_API_KEY is not set on the server.' }) }
  }
  if (!sameSecret(request.headers.get('x-import-passcode') ?? '', passcode)) {
    return { response: json(401, { error: 'unauthorized', message: 'Wrong or missing passcode.' }) }
  }
  try {
    return { body: await request.json() }
  } catch {
    return { response: json(400, { error: 'bad_request', message: 'Body must be valid JSON.' }) }
  }
}

/** Calls the model for a structured recipe and maps the outcome to an HTTP response. */
export async function runRecipeModel(opts: {
  system: string
  user: string
  categories: string[]
  effort: 'low' | 'medium' | 'high'
}): Promise<Response> {
  const client = new Anthropic()
  try {
    const response = await client.messages.parse({
      model: process.env.RECIPE_IMPORT_MODEL || 'claude-opus-5-5',
      max_tokens: 16000,
      system: opts.system,
      output_config: { effort: opts.effort, format: zodOutputFormat(RecipeOutputSchema) },
      messages: [{ role: 'user', content: opts.user }],
    })

    if (response.stop_reason === 'refusal') {
      return json(422, { error: 'refused', message: 'The model declined to process this request.' })
    }
    const out = response.parsed_output
    if (!out) return json(502, { error: 'bad_model_output', message: 'The model returned an unreadable result.' })
    if (!out.is_recipe) return json(200, { recipe: null })

    const allowed = new Map(opts.categories.map((c) => [c.toLowerCase(), c]))
    return json(200, {
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
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status : undefined
    console.error('AI request failed:', e instanceof Error ? e.name : 'unknown', status ?? '')
    if (e instanceof Anthropic.RateLimitError) {
      return json(429, { error: 'rate_limited', message: 'Rate limited by the AI provider. Try again in a minute.' })
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return json(502, { error: 'provider_auth', message: 'The server’s Anthropic API key was rejected.' })
    }
    return json(502, { error: 'provider_error', message: 'The AI provider failed. Try again.' })
  }
}
