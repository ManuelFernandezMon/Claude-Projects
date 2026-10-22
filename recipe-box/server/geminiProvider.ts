import { ApiError, FinishReason, GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { RecipeOutputSchema, type ProviderRequest, type ProviderResult } from './schema.js'

/** gemini-3.8-flash is listed as free-of-charge in Google's pricing table; override with GEMINI_MODEL. */
const DEFAULT_MODEL = 'gemini-3.8-flash'

// responseJsonSchema accepts only a subset of JSON Schema; "$schema" is not in the supported list.
const { $schema: _omit, ...RESPONSE_SCHEMA } = z.toJSONSchema(RecipeOutputSchema) as Record<string, unknown>

const BLOCKED_FINISH: string[] = [
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
  FinishReason.RECITATION,
]

async function once(ai: GoogleGenAI, req: ProviderRequest): Promise<ProviderResult> {
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    contents: req.user,
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

export async function callGemini(req: ProviderRequest): Promise<ProviderResult> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}),
  })
  const first = await once(ai, req)
  // One retry for malformed JSON; nothing else is worth spending free-tier quota on.
  return first.kind === 'bad_output' ? once(ai, req) : first
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
    if (e.status === 401 || e.status === 403 || /api key/i.test(e.message)) {
      return { status: 502, error: 'provider_auth', message: 'The server’s Gemini API key was rejected.' }
    }
  }
  return { status: 502, error: 'provider_error', message: 'The AI provider failed. Try again.' }
}
