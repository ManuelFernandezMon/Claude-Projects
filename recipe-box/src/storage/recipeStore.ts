import type { Category, ImportMode, Recipe, StoredImage, StorageSnapshot } from '../types'
import { createIdbRecipeStore } from './idbRecipeStore'

export interface ImageChanges {
  add: StoredImage[]
  removeIds: string[]
}

/**
 * Everything the UI needs from persistence. The UI imports only `recipeStore`
 * from this file; to move to Supabase, implement this interface and swap the
 * assignment at the bottom.
 */
export interface RecipeStore {
  listRecipes(): Promise<Recipe[]>
  getRecipe(id: string): Promise<Recipe | undefined>
  /** Saves the recipe and applies image changes in a single transaction. */
  saveRecipe(recipe: Recipe, images?: ImageChanges): Promise<void>
  /** Deletes the recipe and its images. */
  deleteRecipe(id: string): Promise<void>
  /** Persists checklist state without touching `updatedAt`. */
  setChecked(recipeId: string, checked: string[]): Promise<void>
  /** Deletes every recipe flagged `isSample`; returns how many were removed. */
  deleteSampleRecipes(): Promise<number>

  listCategories(): Promise<Category[]>
  saveCategory(category: Category): Promise<void>
  /** Removes the category and un-tags it from recipes. Recipes are kept. */
  deleteCategory(id: string): Promise<void>

  getImageBlob(id: string): Promise<Blob | undefined>

  exportSnapshot(): Promise<StorageSnapshot>
  importSnapshot(snapshot: StorageSnapshot, mode: ImportMode): Promise<void>
}

export const recipeStore: RecipeStore = createIdbRecipeStore()
