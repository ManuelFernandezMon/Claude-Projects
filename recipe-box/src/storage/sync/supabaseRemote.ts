import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, Recipe } from '../../types'
import type { PullResult, Remote, RemoteRow } from './types'

const PAGE = 500
const BUCKET = 'photos'

interface Row {
  id: string
  data: unknown
  deleted: boolean
  updated_at: number
  server_time: string
}

function fail(what: string, error: { message?: string; code?: string }, status?: number): never {
  throw Object.assign(new Error(`${what}: ${error.message ?? error.code ?? 'failed'}`), { status })
}

const toRow = <T>(r: Row): RemoteRow<T> => ({ id: r.id, data: (r.data as T | null) ?? null, deleted: r.deleted, updatedAt: Number(r.updated_at), serverTime: r.server_time })

/** The cloud side on Supabase: two tables with row-level rules (see supabase/schema.sql) and a private photo bucket. */
export function createSupabaseRemote(client: SupabaseClient, userId: string): Remote {
  async function page(table: 'recipes' | 'categories', since: string | null): Promise<Row[]> {
    let q = client.from(table).select('id,data,deleted,updated_at,server_time').order('server_time', { ascending: true }).limit(PAGE)
    if (since) q = q.gte('server_time', since) // gte: rows written in the same instant as the cursor are never skipped; seeing one twice is harmless
    const { data, error, status } = await q
    if (error) fail(`Could not read ${table}`, error, status)
    return (data ?? []) as Row[]
  }

  return {
    async pull(since): Promise<PullResult> {
      const [recipes, categories] = await Promise.all([page('recipes', since), page('categories', since)])
      // a full page means there is more; the cursor then stops at the earliest point both lists are known to cover
      const covered = (rows: Row[]) => (rows.length < PAGE ? null : rows[rows.length - 1].server_time)
      const stops = [covered(recipes), covered(categories)].filter((x): x is string => x !== null)
      const all = [...recipes, ...categories].map((r) => r.server_time).sort()
      const cursor = stops.length ? stops.sort()[0] : (all[all.length - 1] ?? since)
      return { recipes: recipes.map((r) => toRow<Recipe>(r)), categories: categories.map((r) => toRow<Category>(r)), cursor }
    },

    async putRecipe(row) {
      const { error, status } = await client.rpc('upsert_recipe', { p_id: row.id, p_data: row.data, p_deleted: row.deleted, p_updated_at: row.updatedAt })
      if (error) fail('Could not save a recipe', error, status)
    },

    async putCategory(row) {
      const { error, status } = await client.rpc('upsert_category', { p_id: row.id, p_data: row.data, p_deleted: row.deleted, p_updated_at: row.updatedAt })
      if (error) fail('Could not save a category', error, status)
    },

    async uploadImage(id, blob) {
      const { error } = await client.storage.from(BUCKET).upload(`${userId}/${id}`, blob, { upsert: true, contentType: blob.type || 'image/jpeg' })
      if (error) fail('Could not upload a photo', error, (error as { statusCode?: number }).statusCode)
    },

    async downloadImage(id) {
      const { data, error } = await client.storage.from(BUCKET).download(`${userId}/${id}`)
      if (error) {
        const code = String((error as { statusCode?: unknown }).statusCode ?? '')
        if (code === '404' || code === '400' || /not found/i.test(error.message)) return undefined // not uploaded (yet)
        fail('Could not download a photo', error)
      }
      return data ?? undefined
    },

    async deleteImage(id) {
      const { error } = await client.storage.from(BUCKET).remove([`${userId}/${id}`])
      if (error) fail('Could not delete a photo', error)
    },
  }
}
