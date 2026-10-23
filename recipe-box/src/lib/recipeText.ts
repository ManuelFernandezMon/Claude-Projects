import type { Recipe } from '../types'
import { formatMinutes } from './format'

const line = (i: { quantity?: string; name: string }) => [i.quantity, i.name].filter(Boolean).join(' ')

/** One ingredient per line, e.g. for pasting into a notes or shopping app. */
export function ingredientsToText(recipe: Recipe): string {
  return recipe.ingredients.map(line).join('\n')
}

/** A plain-text version of the whole recipe for messages and notes. */
export function recipeToText(recipe: Recipe): string {
  const facts = [
    recipe.prepMinutes ? `Prep ${formatMinutes(recipe.prepMinutes)}` : '',
    recipe.cookMinutes ? `Cook ${formatMinutes(recipe.cookMinutes)}` : '',
    recipe.servings ? `Serves ${recipe.servings}` : '',
  ].filter(Boolean)
  const parts = [recipe.title]
  if (facts.length) parts.push(facts.join(', '))
  if (recipe.ingredients.length) parts.push(`Ingredients\n${recipe.ingredients.map((i) => `- ${line(i)}`).join('\n')}`)
  if (recipe.steps.length) parts.push(`Instructions\n${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`)
  if (recipe.sourceUrl) parts.push(`Source: ${recipe.sourceUrl}`)
  return parts.join('\n\n')
}
