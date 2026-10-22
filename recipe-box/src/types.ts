export interface Ingredient {
  id: string
  name: string
  quantity?: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  steps: string[]
  ingredients: Ingredient[]
  /** IDs of ingredients currently checked off. */
  checked: string[]
  categoryIds: string[]
  prepMinutes?: number
  cookMinutes?: number
  servings?: number
  /** Image IDs in display order; the first one is the cover. */
  imageIds: string[]
  /** Link to the original TikTok/Instagram/web post, if the recipe was imported from one. */
  sourceUrl?: string
  isSample?: boolean
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: string
  name: string
  color: string
  order: number
}

export interface StoredImage {
  id: string
  recipeId: string
  createdAt: number
  blob: Blob
}

/** Raw snapshot of everything in the store (images as Blobs). */
export interface StorageSnapshot {
  recipes: Recipe[]
  categories: Category[]
  images: StoredImage[]
}

export type ImportMode = 'merge' | 'replace'

/** Shape returned by /api/extract. */
export interface ImportedRecipe {
  title: string
  description: string
  ingredients: { quantity: string; name: string }[]
  steps: string[]
  prepMinutes: number | null
  cookMinutes: number | null
  servings: number | null
  categoryNames: string[]
}

/** Data handed from the import page to the editor via router state. */
export interface RecipePrefill {
  title: string
  description: string
  prep: string
  cook: string
  servings: string
  categoryIds: string[]
  ingredients: Ingredient[]
  steps: string[]
  sourceUrl: string
}
