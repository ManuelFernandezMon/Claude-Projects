import { recipeStore } from '../storage/recipeStore'
import type { ImportedRecipe, Recipe } from '../types'
import { postAi } from './importApi'
import { applyProposal } from './recipeDiff'

export { applyProposal, diffRecipes, toImported } from './recipeDiff'
export type { DiffKind, DiffLine, RecipeDiff } from './recipeDiff'

/** Asks the AI to change a saved recipe. `base` is the recipe as it stands now (the saved one, or the last proposal). */
export async function proposeEdit(base: ImportedRecipe, instruction: string, passcode: string): Promise<ImportedRecipe | null> {
  return postAi('/api/generate', { prompt: instruction.trim(), previous: base, mode: 'edit', categories: [] }, passcode)
}

/** Saves the changes over the existing recipe. */
export async function saveReplacement(original: Recipe, proposal: ImportedRecipe): Promise<Recipe> {
  const updated = applyProposal(original, proposal)
  await recipeStore.saveRecipe(updated)
  return updated
}
