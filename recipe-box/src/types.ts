/** The same amount written in other units. Filled by the AI conversion, so cups of flour can also be shown in grams. */
export interface Measures {
  metric?: string
  us?: string
  /** True when a conversion crossed between volume and weight (needs a typical density) or is a rough estimate. */
  approx?: boolean
}

export interface Ingredient {
  id: string
  name: string
  quantity?: string
  measures?: Measures
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
  /** Who took each stock photo, keyed by image ID. Only photos found through "Find a photo" have an entry. */
  photoCredits?: Record<string, PhotoCredit>
  /** Written by the AI assistant and not tested by the user. */
  aiGenerated?: boolean
  /** An existing recipe the AI assistant changed (not tested). */
  aiEdited?: boolean
  isSample?: boolean
  createdAt: number
  updatedAt: number
}

/** Attribution for a stock photo (Pexels asks for a link to the photo's page and the photographer's name). */
export interface PhotoCredit {
  name: string
  url: string
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
  ingredients: { quantity: string; name: string; metric?: string; us?: string; approximate?: boolean }[]
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
  aiGenerated?: boolean
}
