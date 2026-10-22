import type { Category, ImportedRecipe, RecipePrefill } from '../types'
import { newId } from './id'

export function toPrefill(
  r: ImportedRecipe,
  categories: Category[],
  opts: { sourceUrl?: string; aiGenerated?: boolean } = {},
): RecipePrefill {
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
  return {
    title: r.title,
    description: r.description,
    prep: r.prepMinutes?.toString() ?? '',
    cook: r.cookMinutes?.toString() ?? '',
    servings: r.servings?.toString() ?? '',
    categoryIds: r.categoryNames.flatMap((n) => byName.get(n.toLowerCase()) ?? []),
    ingredients: r.ingredients.map((i) => ({ id: newId(), name: i.name, quantity: i.quantity || undefined })),
    steps: r.steps,
    sourceUrl: opts.sourceUrl ?? '',
    aiGenerated: opts.aiGenerated,
  }
}
