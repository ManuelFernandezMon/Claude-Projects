import { recipeStore } from '../storage/recipeStore'
import type { Recipe, StoredImage } from '../types'
import { newId } from './id'

/** Saves a copy of the recipe, including its own copies of the photos, so deleting one never affects the other. */
export async function duplicateRecipe(source: Recipe): Promise<Recipe> {
  const now = Date.now()
  const id = newId()
  const images: StoredImage[] = []
  const photoCredits: NonNullable<Recipe['photoCredits']> = {}
  for (const imageId of source.imageIds) {
    const blob = await recipeStore.getImageBlob(imageId)
    if (!blob) continue
    const copyId = newId()
    images.push({ id: copyId, recipeId: id, createdAt: now, blob })
    const credit = source.photoCredits?.[imageId]
    if (credit) photoCredits[copyId] = credit
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
    photoCredits: Object.keys(photoCredits).length ? photoCredits : undefined,
    isSample: undefined,
    createdAt: now,
    updatedAt: now,
  }
  await recipeStore.saveRecipe(copy, { add: images, removeIds: [] })
  return copy
}
