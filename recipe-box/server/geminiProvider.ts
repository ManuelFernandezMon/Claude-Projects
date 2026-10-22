import { ApiError, FinishReason, GoogleGenAI, createPartFromUri } from '@google/genai'
import { z } from 'zod'
import { RecipeOutputSchema, type ProviderRequest, type ProviderResult } from './schema.js'

/**
 * Ordered preference list (all listed as free-of-charge on Google's pricing table; the 2.5 models may be restricted to
 * keys that used them before, in which case they return 404 and are skipped). When a model is overloaded (503),
 * over quota (429) or unknown to the key (404), the next one is tried. GEMINI_MODEL can be one ID or a comma-separated list.
 */
const DEFAULT_MODELS =
  'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-2.5-flash,gemini-2.5-flash-lite'
const REQUEST_TIMEOUT_MS = 25_000
const VIDEO_REQUEST_TIMEOUT_MS = 45_000
/** Stop starting new attempts after this long, and cap each attempt so the whole call ends before the 60 s function limit. */
const DEADLINE_MS = 30_000
const HARD_LIMIT_MS = 55_000

const models = () =>
  (process.env.GEMINI_MODEL || DEFAULT_MODELS)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
const retryDelayMs = () => Number(process.env.GEMINI_RETRY_DELAY_MS ?? 1000)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// responseJsonSchema accepts only a subset of JSON Schema; "$schema" is not in the supported list.
const { $schema: _omit, ...RESPONSE_SCHEMA } = z.toJSONSchema(RecipeOutputSchema) as Record<string, unknown>

const BLOCKED_FINISH: string[] = [
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
  FinishReason.RECITATION,
]

async function once(ai: GoogleGenAI, model: string, req: ProviderRequest): Promise<ProviderResult> {
  const res = await ai.models.generateContent({
    model,
    contents: req.video
      ? [{ role: 'user', parts: [createPartFromUri(req.video.uri, req.video.mimeType), { text: req.user }] }]
      : req.user,
    config: {
      systemInstruction: req.system,
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 16000,
    },
  })
  if (res.promptFeedback?.blockReason) return { kind: 'refused' }
  const finish = res.candidates?.[0]?.finishReason
  if (finish && BLOCKED_FINISH.includes(finish)) return { kind: 'refused' }

  let raw: unknown
  try {
    raw = JSON.parse(res.text ?? '')
  } catch {
    return { kind: 'bad_output' }
  }
  // Free-tier models are less reliable than strict structured outputs: always validate.
  const parsed = RecipeOutputSchema.safeParse(raw)
  return parsed.success ? { kind: 'ok', out: parsed.data } : { kind: 'bad_output' }
}

const isTransient = (status: number) => status === 500 || status === 503 || status === 504

export function makeGeminiClient(timeoutMs = REQUEST_TIMEOUT_MS): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      timeout: timeoutMs,
      retryOptions: { attempts: 1 }, // we do our own bounded retries below
      ...(process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : {}),
    },
  })
}

/** `started` lets a caller that already spent time (e.g. waiting for a video to process) share one overall deadline. */
export async function callGemini(req: ProviderRequest, started = Date.now()): Promise<ProviderResult> {
  let lastError: unknown
  for (const model of models()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const elapsed = Date.now() - started
      if (elapsed > DEADLINE_MS) throw lastError ?? new Error('Gemini deadline exceeded')
      const cap = req.video ? VIDEO_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS
      const ai = makeGeminiClient(Math.max(5_000, Math.min(cap, HARD_LIMIT_MS - elapsed)))
      try {
        const first = await once(ai, model, req)
        // One retry for malformed JSON on the same model; nothing else is worth spending free-tier quota on.
        return first.kind === 'bad_output' ? await once(ai, model, req) : first
      } catch (e) {
        lastError = e
        if (!(e instanceof ApiError)) throw e
        console.warn(`gemini ${model} attempt ${attempt + 1} failed: HTTP ${e.status}`)
        if (isTransient(e.status) && attempt === 0) {
          await sleep(retryDelayMs()) // brief pause, then one more try on the same model
          continue
        }
        if (isTransient(e.status) || e.status === 429 || e.status === 404) break // try the next model
        throw e // bad key or bad request: another model will not help
      }
    }
  }
  throw lastError
}

export function mapGeminiError(e: unknown): { status: number; error: string; message: string } {
  if (e instanceof ApiError) {
    if (e.status === 429) {
      return {
        status: 429,
        error: 'rate_limited',
        message: 'Gemini free-tier quota reached. Try again later (limits reset daily and per minute).',
      }
    }
    if (isTransient(e.status)) {
      return {
        status: 502,
        error: 'provider_overloaded',
        message: 'Gemini is overloaded right now (the free tier has no capacity guarantee). Try again in a minute.',
      }
    }
    if (e.status === 404) {
      return {
        status: 502,
        error: 'model_unavailable',
        message: 'None of the configured Gemini models is available to this API key. Set GEMINI_MODEL to a model you can use.',
      }
    }
    if (e.status === 401 || e.status === 403 || /api key/i.test(e.message)) {
      return { status: 502, error: 'provider_auth', message: 'The server’s Gemini API key was rejected.' }
    }
  }
  return { status: 502, error: 'provider_error', message: 'The AI provider failed. Try again.' }
}
