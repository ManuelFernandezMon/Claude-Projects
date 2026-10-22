import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { RecipeOutputSchema, type ProviderRequest, type ProviderResult } from './schema.js'

export async function callAnthropic(req: ProviderRequest): Promise<ProviderResult> {
  const client = new Anthropic()
  const response = await client.messages.parse({
    model: process.env.RECIPE_IMPORT_MODEL || 'claude-opus-5-5',
    max_tokens: 16000,
    system: req.system,
    output_config: { effort: req.effort, format: zodOutputFormat(RecipeOutputSchema) },
    messages: [{ role: 'user', content: req.user }],
  })
  if (response.stop_reason === 'refusal') return { kind: 'refused' }
  return response.parsed_output ? { kind: 'ok', out: response.parsed_output } : { kind: 'bad_output' }
}

export function mapAnthropicError(e: unknown): { status: number; error: string; message: string } {
  if (e instanceof Anthropic.RateLimitError) {
    return { status: 429, error: 'rate_limited', message: 'Rate limited by the AI provider. Try again in a minute.' }
  }
  if (e instanceof Anthropic.AuthenticationError) {
    return { status: 502, error: 'provider_auth', message: 'The server’s Anthropic API key was rejected.' }
  }
  return { status: 502, error: 'provider_error', message: 'The AI provider failed. Try again.' }
}
