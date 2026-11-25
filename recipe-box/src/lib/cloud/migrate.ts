import type { Category, Recipe } from '../../types'
import type { LocalStore } from '../../storage/sync/types'
import type { RecipeStore } from '../../storage/recipeStore'

const KEY = 'cloud-migration'
export type MigrationState = 'done' | 'declined'

/** What this phone's signed-out copy holds that is worth moving to an account (samples are not). */
export async function guestRecipeCount(guest: LocalStore): Promise<number> {
  if (await guest.metaGet<MigrationState>(KEY)) return 0
  return (await guest.listRecipes()).filter((r) => !r.isSample).length
}

export const markMigration = (guest: LocalStore, state: MigrationState) => guest.metaSet(KEY, state)

/**
 * Copies the signed-out recipes, categories and photos into the account. Categories with the same name as one the account
 * already has are merged instead of duplicated. Returns how many recipes were added.
 */
export async function moveGuestToAccount(guest: LocalStore, account: RecipeStore): Promise<number> {
  const snap = await guest.exportSnapshot()
  const recipes = snap.recipes.filter((r) => !r.isSample)
  const existing = await account.listCategories()
  const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]))
  const remap = new Map<string, string>()
  const newCategories: Category[] = []
  const used = new Set(recipes.flatMap((r) => r.categoryIds))
  for (const c of snap.categories) {
    if (!used.has(c.id)) continue // sample categories nobody uses are not carried over
    const same = byName.get(c.name.trim().toLowerCase())
    if (same) remap.set(c.id, same)
    else {
      newCategories.push({ ...c, order: existing.length + newCategories.length })
      byName.set(c.name.trim().toLowerCase(), c.id)
    }
  }
  const moved: Recipe[] = recipes.map((r) => ({ ...r, categoryIds: [...new Set(r.categoryIds.map((id) => remap.get(id) ?? id))] }))
  const ids = new Set(moved.map((r) => r.id))
  await account.importSnapshot({ recipes: moved, categories: newCategories, images: snap.images.filter((i) => ids.has(i.recipeId)) }, 'merge')
  await markMigration(guest, 'done')
  return moved.length
}
