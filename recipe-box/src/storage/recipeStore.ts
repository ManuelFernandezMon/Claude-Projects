import type { Category, ImportMode, Recipe, StoredImage, StorageSnapshot } from '../types'
import { createIdbRecipeStore } from './idbRecipeStore'

export interface ImageChanges {
  add: StoredImage[]
  removeIds: string[]
}

/**
 * Everything the UI needs from persistence. The UI imports only `recipeStore`
 * from this file; behind it sits either the phone's own copy or, when signed in,
 * that copy kept in step with the cloud (see ./sync).
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

/** The signed-out copy: the one this phone has always had. */
export const guestStore = createIdbRecipeStore()

let active: RecipeStore = guestStore
const listeners = new Set<() => void>()

/** Switches what the screens read and write: the signed-out copy, or the account's synced copy. */
export function setActiveStore(store: RecipeStore): void {
  if (active === store) return
  active = store
  listeners.forEach((l) => l())
}

/** Called when the active store is swapped (signing in or out). Returns the unsubscribe function. */
export function onStoreSwapped(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Every screen uses this; it always forwards to whichever store is active. */
export const recipeStore: RecipeStore = {
  listRecipes: () => active.listRecipes(),
  getRecipe: (id) => active.getRecipe(id),
  saveRecipe: (r, i) => active.saveRecipe(r, i),
  deleteRecipe: (id) => active.deleteRecipe(id),
  setChecked: (id, c) => active.setChecked(id, c),
  deleteSampleRecipes: () => active.deleteSampleRecipes(),
  listCategories: () => active.listCategories(),
  saveCategory: (c) => active.saveCategory(c),
  deleteCategory: (id) => active.deleteCategory(id),
  getImageBlob: (id) => active.getImageBlob(id),
  exportSnapshot: () => active.exportSnapshot(),
  importSnapshot: (s, m) => active.importSnapshot(s, m),
}
