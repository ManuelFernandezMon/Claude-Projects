import type { Category, ImportMode, Recipe, StorageSnapshot } from '../../types'
import type { ImageChanges, RecipeStore } from '../recipeStore'
import type { LocalStore, OutboxEntry, Remote } from './types'

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'offline' | 'error'
  /** Changes made on this phone that are not in the cloud yet. */
  pending: number
  lastSyncAt?: number
  error?: string
  /** True when the last failure was the sign-in itself (the cloud refused the account). */
  authFailed?: boolean
}

export interface SyncedStore extends RecipeStore {
  /** Sends what is waiting, then fetches what changed elsewhere. Safe to call at any time; overlapping calls share one run. */
  sync(): Promise<void>
  status(): SyncStatus
  /** Starts the automatic syncing (now, then on reconnect, on return to the app, and every few minutes). */
  start(): void
  /** Stops it. The local copy stays as it is. */
  dispose(): void
  readonly local: LocalStore
}

interface Hooks {
  /** Data on this phone changed because of something that came from the cloud: screens should reload. */
  onData: () => void
  onStatus: (status: SyncStatus) => void
}

const CURSOR = 'cloud-cursor'
const DEBOUNCE_MS = 1500
const INTERVAL_MS = 120_000
const PREFETCH_PARALLEL = 3

/** What is stored in the cloud: the recipe without its checklist ticks, which belong to this phone only. */
export function forCloud(recipe: Recipe): Recipe {
  const { checked: _checked, isSample: _isSample, ...rest } = recipe
  return { ...rest, checked: [] }
}

const entryKey = (kind: OutboxEntry['kind'], id: string) => `${kind}:${id}`

/**
 * Wraps the phone's own store so every change is also sent to the cloud, and changes made on other phones arrive here.
 *
 * The phone's copy stays the one the screens read, so the app works offline. Changes are queued in an outbox and sent when
 * there is a connection. When two phones changed the same recipe, the later edit wins (by its `updatedAt`); deleting is also a
 * change, kept in the cloud as a marker so the other phones remove it too.
 */
export function createSyncedStore(local: LocalStore, remote: Remote, hooks: Hooks): SyncedStore {
  let status: SyncStatus = { state: 'idle', pending: 0 }
  let running: Promise<void> | undefined
  let again = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let interval: ReturnType<typeof setInterval> | undefined
  let disposed = false
  const cleanups: (() => void)[] = []

  const setStatus = (patch: Partial<SyncStatus>) => {
    status = { ...status, ...patch }
    hooks.onStatus(status)
  }

  async function refreshPending() {
    setStatus({ pending: (await local.outboxList()).length })
  }

  async function enqueue(entries: Omit<OutboxEntry, 'key' | 'at'>[]) {
    if (!entries.length) return
    const at = Date.now()
    await local.outboxPut(entries.map((e) => ({ ...e, key: entryKey(e.kind, e.id), at })))
    await refreshPending()
    schedule()
  }

  function schedule() {
    if (disposed) return
    clearTimeout(timer)
    timer = setTimeout(() => void sync(), DEBOUNCE_MS)
  }

  // ---------- sending ----------

  async function push(): Promise<void> {
    const entries = (await local.outboxList()).sort((a, b) => (a.kind === 'image' ? 0 : 1) - (b.kind === 'image' ? 0 : 1) || a.at - b.at)
    for (const e of entries) {
      if (e.kind === 'image') {
        if (e.op === 'put') {
          const blob = await local.getImageBlob(e.id)
          if (blob) await remote.uploadImage(e.id, blob)
        } else {
          await remote.deleteImage(e.id)
        }
      } else if (e.kind === 'recipe') {
        if (e.op === 'put') {
          const r = await local.getRecipe(e.id)
          if (r) await remote.putRecipe({ id: e.id, data: forCloud(r), deleted: false, updatedAt: r.updatedAt })
        } else {
          await remote.putRecipe({ id: e.id, data: null, deleted: true, updatedAt: e.at })
        }
      } else if (e.op === 'put') {
        const c = (await local.listCategories()).find((x) => x.id === e.id)
        if (c) await remote.putCategory({ id: e.id, data: c, deleted: false, updatedAt: e.at })
      } else {
        await remote.putCategory({ id: e.id, data: null, deleted: true, updatedAt: e.at })
      }
      await local.outboxClear([e])
      await refreshPending()
    }
  }

  // ---------- receiving ----------

  async function pull(): Promise<boolean> {
    let changed = false
    let cursor = (await local.metaGet<string | null>(CURSOR)) ?? null
    for (let page = 0; page < 50; page++) {
      const res = await remote.pull(cursor)
      const waiting = new Set((await local.outboxList()).map((e) => e.key))
      const categories = await local.listCategories()

      for (const row of res.categories) {
        if (waiting.has(entryKey('category', row.id))) continue // this phone has its own unsent change: it will be sent and the later edit wins
        const have = categories.find((c) => c.id === row.id)
        if (row.deleted) {
          if (have) {
            await local.deleteCategory(row.id)
            changed = true
          }
        } else if (row.data && JSON.stringify(have) !== JSON.stringify(row.data)) {
          await local.saveCategory(row.data)
          changed = true
        }
      }

      for (const row of res.recipes) {
        if (waiting.has(entryKey('recipe', row.id))) continue
        const have = await local.getRecipe(row.id)
        if (row.deleted) {
          if (have) {
            await local.deleteRecipe(row.id)
            changed = true
          }
        } else if (row.data && (!have || row.updatedAt > have.updatedAt)) {
          await local.saveRecipe({ ...row.data, checked: have?.checked ?? [] })
          changed = true
        }
      }

      const last = res.cursor
      const moved = last !== null && last !== cursor
      if (last !== null) {
        cursor = last
        await local.metaSet(CURSOR, cursor)
      }
      if (!moved || res.recipes.length + res.categories.length < 500) break
    }
    return changed
  }

  /** Photos of recipes that arrived from the cloud, so they also show offline. Never blocks or fails the sync. */
  async function prefetchImages(): Promise<void> {
    const need: { id: string; recipeId: string }[] = []
    for (const r of await local.listRecipes()) for (const id of r.imageIds) if (!(await local.hasImage(id))) need.push({ id, recipeId: r.id })
    let next = 0
    const worker = async () => {
      while (next < need.length && !disposed) {
        const { id, recipeId } = need[next++]
        try {
          const blob = await remote.downloadImage(id)
          if (blob) await local.putImageBlob(id, recipeId, blob)
        } catch {
          /* it will be tried again the next time the photo is shown */
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(PREFETCH_PARALLEL, need.length) }, worker))
    if (need.length) hooks.onData()
  }

  async function runOnce(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus({ state: 'offline' })
      return
    }
    setStatus({ state: 'syncing', error: undefined, authFailed: undefined })
    try {
      await push()
      const changed = await pull()
      setStatus({ state: 'idle', lastSyncAt: Date.now() })
      await refreshPending()
      if (changed) hooks.onData()
      void prefetchImages()
    } catch (e) {
      const code = (e as { status?: number }).status
      setStatus({
        state: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error',
        error: e instanceof Error ? e.message : String(e),
        authFailed: code === 401 || code === 403,
      })
      await refreshPending().catch(() => undefined)
    }
  }

  function sync(): Promise<void> {
    if (disposed) return Promise.resolve()
    if (running) {
      again = true
      return running
    }
    running = (async () => {
      do {
        again = false
        await runOnce()
      } while (again && !disposed)
    })().finally(() => {
      running = undefined
    })
    return running
  }

  // ---------- the store the screens use ----------

  return {
    local,
    listRecipes: () => local.listRecipes(),
    getRecipe: (id) => local.getRecipe(id),
    listCategories: () => local.listCategories(),
    exportSnapshot: () => local.exportSnapshot(),
    setChecked: (recipeId, checked) => local.setChecked(recipeId, checked), // ticks stay on this phone

    async getImageBlob(id) {
      const have = await local.getImageBlob(id)
      if (have) return have
      try {
        const blob = await remote.downloadImage(id)
        if (!blob) return undefined
        const owner = (await local.listRecipes()).find((r) => r.imageIds.includes(id))
        await local.putImageBlob(id, owner?.id ?? '', blob)
        return blob
      } catch {
        return undefined
      }
    },

    async saveRecipe(recipe: Recipe, images?: ImageChanges) {
      await local.saveRecipe(recipe, images)
      await enqueue([
        { kind: 'recipe', id: recipe.id, op: 'put' },
        ...(images?.add ?? []).map((i) => ({ kind: 'image' as const, id: i.id, op: 'put' as const })),
        ...(images?.removeIds ?? []).map((id) => ({ kind: 'image' as const, id, op: 'delete' as const })),
      ])
    },

    async deleteRecipe(id) {
      const before = await local.getRecipe(id)
      await local.deleteRecipe(id)
      await enqueue([{ kind: 'recipe', id, op: 'delete' }, ...(before?.imageIds ?? []).map((i) => ({ kind: 'image' as const, id: i, op: 'delete' as const }))])
    },

    async deleteSampleRecipes() {
      return local.deleteSampleRecipes() // samples are never in the cloud
    },

    async saveCategory(category: Category) {
      await local.saveCategory(category)
      await enqueue([{ kind: 'category', id: category.id, op: 'put' }])
    },

    async deleteCategory(id) {
      await local.deleteCategory(id)
      await enqueue([{ kind: 'category', id, op: 'delete' }]) // other phones un-tag their recipes themselves when they see it
    },

    async importSnapshot(snapshot: StorageSnapshot, mode: ImportMode) {
      const now = Date.now()
      let gone: StorageSnapshot = { recipes: [], categories: [], images: [] }
      if (mode === 'replace') {
        const keep = new Set(snapshot.recipes.map((r) => r.id))
        const keepCats = new Set(snapshot.categories.map((c) => c.id))
        const current = await local.exportSnapshot()
        gone = {
          recipes: current.recipes.filter((r) => !keep.has(r.id)),
          categories: current.categories.filter((c) => !keepCats.has(c.id)),
          images: current.images,
        }
      }
      // a restored backup is a deliberate change: it must beat what the cloud already has
      const recipes = mode === 'replace' ? snapshot.recipes.map((r) => ({ ...r, updatedAt: now })) : snapshot.recipes
      await local.importSnapshot({ ...snapshot, recipes }, mode)
      await enqueue([
        ...gone.recipes.map((r) => ({ kind: 'recipe' as const, id: r.id, op: 'delete' as const })),
        ...gone.categories.map((c) => ({ kind: 'category' as const, id: c.id, op: 'delete' as const })),
        ...gone.images.filter((i) => !snapshot.images.some((s) => s.id === i.id)).map((i) => ({ kind: 'image' as const, id: i.id, op: 'delete' as const })),
        ...snapshot.categories.map((c) => ({ kind: 'category' as const, id: c.id, op: 'put' as const })),
        ...snapshot.images.map((i) => ({ kind: 'image' as const, id: i.id, op: 'put' as const })),
        ...recipes.filter((r) => !r.isSample).map((r) => ({ kind: 'recipe' as const, id: r.id, op: 'put' as const })),
      ])
    },

    sync,
    status: () => status,

    start() {
      if (disposed) return
      void refreshPending()
      void sync()
      interval = setInterval(() => void sync(), INTERVAL_MS)
      if (typeof window !== 'undefined') {
        const onOnline = () => void sync()
        const onVisible = () => {
          if (document.visibilityState === 'visible') void sync()
        }
        window.addEventListener('online', onOnline)
        document.addEventListener('visibilitychange', onVisible)
        cleanups.push(() => window.removeEventListener('online', onOnline), () => document.removeEventListener('visibilitychange', onVisible))
      }
    },

    dispose() {
      disposed = true
      clearTimeout(timer)
      clearInterval(interval)
      cleanups.forEach((c) => c())
    },
  }
}
