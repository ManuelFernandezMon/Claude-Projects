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
const REQUEST_TIMEOUT_MS = 20_000
/**
 * Time budgets. The text endpoints are configured for 120 s in vercel.json and video-extract for 300 s (Hobby allows it with
 * Fluid compute). Overloaded models fail in two ways: a fast 503 (worth one quick retry) or a slow 504/hang (not worth waiting
 * for again). So a text attempt is capped at 20 s, only a fast 503 is retried on the same model, and everything else moves on
 * to the next model; the whole chain is walked twice before giving up.
 */
const textBudget = () => ({
  timeout: Number(process.env.GEMINI_TEXT_TIMEOUT_MS) || REQUEST_TIMEOUT_MS,
  deadline: 90_000,
  hardLimit: 108_000,
  perModel: 2,
  passes: 2,
})
const VIDEO = { timeout: 100_000, deadline: 170_000, hardLimit: 285_000, perModel: 1, passes: 2 }
const PASS_GAP_MS = () => Number(process.env.GEMINI_PASS_GAP_MS ?? 4000)

const models = (video = false) => {
  const all = (process.env.GEMINI_MODEL || DEFAULT_MODELS)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
  // The "lite" models are the likeliest to misjudge a video (and then say "no recipe"), so videos skip them.
  const full = all.filter((m) => !/lite/i.test(m))
  return video && full.length ? full : all
}
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

/** A request that hung or dropped (our own timeout, a reset connection): the model is too slow right now, so move on. */
const isSlowFailure = (e: unknown): boolean =>
  e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError' || /timeout|timed out|aborted|ECONNRESET|ETIMEDOUT|fetch failed|socket hang up/i.test(e.message))

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
  const budget = req.video ? VIDEO : textBudget()
  let lastError: unknown
  let sawTransient = false
  // A video verdict of "not a recipe" is only believed after a second model agrees; one vote is kept in case no other model can answer.
  const noVotes: { model: string; result: ProviderResult }[] = []
  for (let pass = 0; pass < budget.passes; pass++) {
    if (pass > 0) {
      if (!sawTransient) break // quota or missing-model errors will not change in a few seconds
      await sleep(PASS_GAP_MS()) // everything was busy: give the service a moment, then walk the chain again
    }
    sawTransient = false
    for (const model of models(!!req.video)) {
      if (noVotes.some((v) => v.model === model)) continue // already asked
      for (let attempt = 0; attempt < budget.perModel; attempt++) {
        const elapsed = Date.now() - started
        if (elapsed > budget.deadline) throw lastError ?? new Error('Gemini deadline exceeded')
        const attemptStart = Date.now()
        const ai = makeGeminiClient(Math.max(5_000, Math.min(budget.timeout, budget.hardLimit - elapsed)))
        try {
          const first = await once(ai, model, req)
          // One retry for malformed JSON on the same model; nothing else is worth spending free-tier quota on.
          const result = first.kind === 'bad_output' ? await once(ai, model, req) : first
          if (result.kind === 'ok') {
            console.log(`gemini ${model} answered (${req.video ? 'video' : 'text'}): is_recipe=${result.out.is_recipe} ingredients=${result.out.ingredients.length} steps=${result.out.steps.length}`)
            if (req.video && !result.out.is_recipe) {
              noVotes.push({ model, result: { ...result, model } })
              if (noVotes.length < 2) break // ask the next model before telling the user there is no recipe
              return noVotes[0]!.result
            }
            return { ...result, model }
          }
          return result
        } catch (e) {
          lastError = e
          if (!(e instanceof ApiError)) {
            if (!isSlowFailure(e)) throw e
            sawTransient = true
            console.warn(`gemini ${model} pass ${pass + 1} attempt ${attempt + 1} too slow: ${e instanceof Error ? e.message : e}`)
            break // next model
          }
          console.warn(`gemini ${model} pass ${pass + 1} attempt ${attempt + 1} failed: HTTP ${e.status}`)
          if (isTransient(e.status)) sawTransient = true
          const quick = Date.now() - attemptStart < 4_000 // a 504 after 20 s is not a blip; a 503 after 1 s usually is
          if ((e.status === 503 || e.status === 500) && quick && attempt + 1 < budget.perModel) {
            await sleep(retryDelayMs()) // brief pause, then one more try on the same model
            continue
          }
          if (isTransient(e.status) || e.status === 429 || e.status === 404) break // try the next model
          throw e // bad key or bad request: another model will not help
        }
      }
    }
  }
  if (noVotes.length) return noVotes[0]!.result // the only model that could answer said no
  throw lastError
}

export function mapGeminiError(e: unknown): { status: number; error: string; message: string } {
  if (isSlowFailure(e)) {
    return {
      status: 502,
      error: 'provider_overloaded',
      message: 'Gemini is overloaded right now (the free tier has no capacity guarantee). Try again in a minute.',
    }
  }
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
