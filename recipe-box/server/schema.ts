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
  /** Only meaningful when is_recipe is false: one short sentence on what the model saw and heard. */
  not_recipe_reason: z.string().optional(),
})

export type RecipeOutput = z.infer<typeof RecipeOutputSchema>

export interface ProviderRequest {
  system: string
  user: string
  effort: 'low' | 'medium' | 'high'
  /** Gemini-only: an uploaded video file the model should watch and listen to. */
  video?: { uri: string; mimeType: string }
}

/** What a provider hands back; API/network failures are thrown and mapped by that provider's `mapError`. */
export type ProviderResult =
  | { kind: 'ok'; out: RecipeOutput; model?: string }
  | { kind: 'refused' }
  | { kind: 'bad_output' }

export type ProviderName = 'anthropic' | 'gemini'
