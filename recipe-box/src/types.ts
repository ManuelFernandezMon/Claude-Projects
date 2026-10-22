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
