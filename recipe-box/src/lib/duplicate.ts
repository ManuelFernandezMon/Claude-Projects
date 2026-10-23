import { recipeStore } from '../storage/recipeStore'
import type { Recipe, StoredImage } from '../types'
import { newId } from './id'

/** Saves a copy of the recipe, including its own copies of the photos, so deleting one never affects the other. */
export async function duplicateRecipe(source: Recipe): Promise<Recipe> {
  const now = Date.now()
  const id = newId()
  const images: StoredImage[] = []
  for (const imageId of source.imageIds) {
    const blob = await recipeStore.getImageBlob(imageId)
    if (blob) images.push({ id: newId(), recipeId: id, createdAt: now, blob })
  }
  const copy: Recipe = {
    ...source,
    id,
    title: `${source.title} (copy)`,
    ingredients: source.ingredients.map((i) => ({ ...i, id: newId() })),
    steps: [...source.steps],
    categoryIds: [...source.categoryIds],
    checked: [],
    imageIds: images.map((i) => i.id),
    isSample: undefined,
    createdAt: now,
    updatedAt: now,
  }
  await recipeStore.saveRecipe(copy, { add: images, removeIds: [] })
  return copy
}
