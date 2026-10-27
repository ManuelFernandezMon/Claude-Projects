import { z } from 'zod'

export const RecipeOutputSchema = z.object({
  is_recipe: z.boolean(),
  title: z.string(),
  description: z.string(),
  ingredients: z.array(
    z.object({
      quantity: z.string(),
      name: z.string(),
      /** Only filled by the conversion task: the same amount in grams / millilitres, and in US cups / spoons / ounces. */
      metric: z.string().optional(),
      us: z.string().optional(),
      /** True when a conversion crossed between volume and weight (needs a typical density) or is a rough estimate. */
      approximate: z.boolean().optional(),
    }),
  ),
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
  /** Gemini-only: material the model should look at: uploaded videos (by file reference) and screenshots (inline, base64). */
  media?: Media[]
}

export type Media = { kind: 'file'; uri: string; mimeType: string } | { kind: 'image'; mimeType: string; data: string }

/** What a provider hands back; API/network failures are thrown and mapped by that provider's `mapError`. */
export type ProviderResult =
  | { kind: 'ok'; out: RecipeOutput; model?: string }
  | { kind: 'refused' }
  | { kind: 'bad_output' }

export type ProviderName = 'anthropic' | 'gemini'
