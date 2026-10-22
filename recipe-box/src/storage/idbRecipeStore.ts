import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Category, ImportMode, Recipe, StoredImage, StorageSnapshot } from '../types'
import type { ImageChanges, RecipeStore } from './recipeStore'
import { buildSeed } from './seed'

interface RecipeDB extends DBSchema {
  recipes: {
    key: string
    value: Recipe
    indexes: { 'by-createdAt': number; 'by-title': string }
  }
  categories: { key: string; value: Category }
  images: {
    key: string
    value: StoredImage
    indexes: { 'by-recipe': string }
  }
  meta: { key: string; value: boolean }
}

type DB = IDBPDatabase<RecipeDB>

const DB_NAME = 'recipe-box'
const DB_VERSION = 1

async function seedIfNeeded(db: DB): Promise<void> {
  const tx = db.transaction(['meta', 'categories', 'recipes'], 'readwrite')
  if (!(await tx.objectStore('meta').get('seeded'))) {
    const seed = buildSeed()
    for (const c of seed.categories) tx.objectStore('categories').put(c)
    for (const r of seed.recipes) tx.objectStore('recipes').put(r)
    tx.objectStore('meta').put(true, 'seeded')
  }
  await tx.done
}

async function openDatabase(): Promise<DB> {
  const db = await openDB<RecipeDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const recipes = database.createObjectStore('recipes', { keyPath: 'id' })
      recipes.createIndex('by-createdAt', 'createdAt')
      recipes.createIndex('by-title', 'title')
      database.createObjectStore('categories', { keyPath: 'id' })
      const images = database.createObjectStore('images', { keyPath: 'id' })
      images.createIndex('by-recipe', 'recipeId')
      database.createObjectStore('meta')
    },
    blocking() {
      // Another tab wants to upgrade; release our connection so it can proceed.
      void dbPromise?.then((d) => d.close())
      dbPromise = undefined
    },
  })
  await seedIfNeeded(db)
  return db
}

let dbPromise: Promise<DB> | undefined

function getDb(): Promise<DB> {
  dbPromise ??= openDatabase().catch((e: unknown) => {
    dbPromise = undefined
    throw e
  })
  return dbPromise
}

export function createIdbRecipeStore(): RecipeStore {
  return {
    async listRecipes() {
      return (await getDb()).getAll('recipes')
    },

    async getRecipe(id) {
      return (await getDb()).get('recipes', id)
    },

    async saveRecipe(recipe: Recipe, images?: ImageChanges) {
      const db = await getDb()
      const tx = db.transaction(['recipes', 'images'], 'readwrite')
      const imageStore = tx.objectStore('images')
      for (const img of images?.add ?? []) imageStore.put(img)
      for (const id of images?.removeIds ?? []) imageStore.delete(id)
      tx.objectStore('recipes').put(recipe)
      await tx.done
    },

    async deleteRecipe(id) {
      const db = await getDb()
      const tx = db.transaction(['recipes', 'images'], 'readwrite')
      const imageStore = tx.objectStore('images')
      const imageKeys = await imageStore.index('by-recipe').getAllKeys(id)
      for (const key of imageKeys) imageStore.delete(key)
      tx.objectStore('recipes').delete(id)
      await tx.done
    },

    async setChecked(recipeId, checked) {
      const db = await getDb()
      const tx = db.transaction('recipes', 'readwrite')
      const recipe = await tx.store.get(recipeId)
      if (recipe) tx.store.put({ ...recipe, checked })
      await tx.done
    },

    async deleteSampleRecipes() {
      const db = await getDb()
      const tx = db.transaction(['recipes', 'images'], 'readwrite')
      const samples = (await tx.objectStore('recipes').getAll()).filter((r) => r.isSample)
      const imageStore = tx.objectStore('images')
      for (const r of samples) {
        const keys = await imageStore.index('by-recipe').getAllKeys(r.id)
        for (const k of keys) imageStore.delete(k)
        tx.objectStore('recipes').delete(r.id)
      }
      await tx.done
      return samples.length
    },

    async listCategories() {
      return (await getDb()).getAll('categories')
    },

    async saveCategory(category) {
      await (await getDb()).put('categories', category)
    },

    async deleteCategory(id) {
      const db = await getDb()
      const tx = db.transaction(['categories', 'recipes'], 'readwrite')
      tx.objectStore('categories').delete(id)
      const recipeStore = tx.objectStore('recipes')
      for (const r of await recipeStore.getAll()) {
        if (r.categoryIds.includes(id)) {
          recipeStore.put({ ...r, categoryIds: r.categoryIds.filter((c) => c !== id) })
        }
      }
      await tx.done
    },

    async getImageBlob(id) {
      return (await (await getDb()).get('images', id))?.blob
    },

    async exportSnapshot(): Promise<StorageSnapshot> {
      const db = await getDb()
      const tx = db.transaction(['recipes', 'categories', 'images'], 'readonly')
      const [recipes, categories, images] = await Promise.all([
        tx.objectStore('recipes').getAll(),
        tx.objectStore('categories').getAll(),
        tx.objectStore('images').getAll(),
      ])
      await tx.done
      return { recipes, categories, images }
    },

    async importSnapshot(snapshot, mode: ImportMode) {
      const db = await getDb()
      const tx = db.transaction(['recipes', 'categories', 'images', 'meta'], 'readwrite')
      const recipes = tx.objectStore('recipes')
      const categories = tx.objectStore('categories')
      const images = tx.objectStore('images')
      if (mode === 'replace') {
        recipes.clear()
        categories.clear()
        images.clear()
      } else {
        // Merge: an imported recipe replaces the local one with the same id, including its images.
        for (const r of snapshot.recipes) {
          const keys = await images.index('by-recipe').getAllKeys(r.id)
          for (const k of keys) images.delete(k)
        }
      }
      for (const c of snapshot.categories) categories.put(c)
      for (const r of snapshot.recipes) recipes.put(r)
      for (const i of snapshot.images) images.put(i)
      // Never re-seed sample recipes after the user has imported their own data.
      tx.objectStore('meta').put(true, 'seeded')
      await tx.done
    },
  }
}
