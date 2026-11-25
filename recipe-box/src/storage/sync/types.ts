import type { Category, Recipe } from '../../types'
import type { RecipeStore } from '../recipeStore'

/** One thing waiting to be sent to the cloud. Recipes and categories are sent as they are at send time, so changes coalesce. */
export interface OutboxEntry {
  /** "recipe:ID", "category:ID" or "image:ID": one entry per thing, so repeated edits do not pile up. */
  key: string
  kind: 'recipe' | 'category' | 'image'
  id: string
  op: 'put' | 'delete'
  /** When it was queued: an entry is only cleared if it has not been queued again since it was sent. */
  at: number
}

/** The device's own copy: the normal store plus the bookkeeping the sync needs. */
export interface LocalStore extends RecipeStore {
  outboxList(): Promise<OutboxEntry[]>
  outboxPut(entries: OutboxEntry[]): Promise<void>
  /** Removes entries only if they are still exactly as they were when listed. */
  outboxClear(entries: OutboxEntry[]): Promise<void>
  metaGet<T>(key: string): Promise<T | undefined>
  metaSet(key: string, value: unknown): Promise<void>
  /** Image ids this copy holds (so a pull knows which photos still have to be downloaded). */
  hasImage(id: string): Promise<boolean>
  putImageBlob(id: string, recipeId: string, blob: Blob): Promise<void>
  /** Deletes this copy completely (signing out of an account on this phone). */
  destroy(): Promise<void>
}

/** A row in the cloud. `data` is the recipe or category without device-only fields; a deleted row keeps only its id. */
export interface RemoteRow<T> {
  id: string
  data: T | null
  deleted: boolean
  /** Client time of the last edit (milliseconds): the tie-breaker when two phones changed the same thing. */
  updatedAt: number
  /** Server time of the last write: what "changed since my last visit" is measured with. */
  serverTime: string
}

export interface PullResult {
  recipes: RemoteRow<Recipe>[]
  categories: RemoteRow<Category>[]
  /** Pass this to the next pull. */
  cursor: string | null
}

/** The cloud side. Implemented for Supabase; an in-memory version is used in tests. */
export interface Remote {
  pull(since: string | null): Promise<PullResult>
  putRecipe(row: { id: string; data: Recipe | null; deleted: boolean; updatedAt: number }): Promise<void>
  putCategory(row: { id: string; data: Category | null; deleted: boolean; updatedAt: number }): Promise<void>
  uploadImage(id: string, blob: Blob): Promise<void>
  downloadImage(id: string): Promise<Blob | undefined>
  deleteImage(id: string): Promise<void>
}
