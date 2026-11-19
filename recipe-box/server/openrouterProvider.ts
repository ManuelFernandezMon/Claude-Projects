import { z } from 'zod'
import { RecipeOutputSchema, type ProviderRequest, type ProviderResult } from './schema.js'

/**
 * Free backup for text-only requests (a caption, a web page, "Ask AI", measurement conversion). Used only when Gemini failed
 * or is overloaded, and only when OPENROUTER_API_KEY is set. Video and screenshots always stay on Gemini.
 * Free models change often and share capacity, so a chain is tried; override it with OPENROUTER_MODELS (comma-separated).
 */
const DEFAULT_MODELS = 'google/gemma-4-31b-it:free,openrouter/free'
const PER_MODEL_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS) || 25_000

export const hasOpenRouterKey = () => !!process.env.OPENROUTER_API_KEY

const baseUrl = () => (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '')
const models = () => (process.env.OPENROUTER_MODELS || DEFAULT_MODELS).split(',').map((m) => m.trim()).filter(Boolean)

/** Models sometimes wrap the JSON in a code fence or add a sentence around it. */
function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(t)
  } catch {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1))
    throw new Error('no JSON in the answer')
  }
}

async function askOne(model: string, req: ProviderRequest): Promise<ProviderResult> {
  const schema = z.toJSONSchema(RecipeOutputSchema)
  const res = await fetch(`${baseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'x-title': 'recipe-box',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 6000,
      response_format: { type: 'json_schema', json_schema: { name: 'recipe', schema } },
      messages: [
        { role: 'system', content: `${req.system}\n\nAnswer with one JSON object that matches this JSON Schema and nothing else:\n${JSON.stringify(schema)}` },
        { role: 'user', content: req.user },
      ],
    }),
    signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
  })
  if (!res.ok) throw Object.assign(new Error(`OpenRouter ${res.status}`), { status: res.status })
  const body = (await res.json()) as { choices?: { message?: { content?: unknown; refusal?: unknown } }[]; model?: string }
  const msg = body.choices?.[0]?.message
  if (msg?.refusal) return { kind: 'refused' }
  if (typeof msg?.content !== 'string') return { kind: 'bad_output' }
  const parsed = RecipeOutputSchema.safeParse(parseJson(msg.content))
  return parsed.success ? { kind: 'ok', out: parsed.data, model: body.model ?? model } : { kind: 'bad_output' }
}

/** Tries each free model in turn; returns the first usable answer, or the last failure. */
export async function callOpenRouter(req: ProviderRequest): Promise<ProviderResult> {
  let last: unknown = new Error('OpenRouter has no model configured')
  let bad = false
  for (const model of models()) {
    try {
      const r = await askOne(model, req)
      if (r.kind === 'ok' || r.kind === 'refused') return r
      bad = true
    } catch (e) {
      last = e
      if ((e as { status?: number }).status === 401) throw e // a rejected key will not work for the next model either
    }
  }
  if (bad) return { kind: 'bad_output' }
  throw last
}
