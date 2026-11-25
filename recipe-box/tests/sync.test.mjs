import { createSyncedStore, forCloud } from '../src/storage/sync/syncedStore.ts'
let pass = 0, fail = 0
const check = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  -> ' + String(d).slice(0, 300)}`) }
const blob = (t) => new Blob([t], { type: 'image/jpeg' })

class MemLocal {
  recipes = new Map(); cats = new Map(); images = new Map(); outbox = new Map(); meta = new Map()
  async listRecipes() { return [...this.recipes.values()] }
  async getRecipe(id) { return this.recipes.get(id) }
  async saveRecipe(r, img) { for (const i of img?.add ?? []) this.images.set(i.id, i); for (const id of img?.removeIds ?? []) this.images.delete(id); this.recipes.set(r.id, structuredClone(r)) }
  async deleteRecipe(id) { for (const [k, v] of this.images) if (v.recipeId === id) this.images.delete(k); this.recipes.delete(id) }
  async setChecked(id, checked) { const r = this.recipes.get(id); if (r) this.recipes.set(id, { ...r, checked }) }
  async deleteSampleRecipes() { return 0 }
  async listCategories() { return [...this.cats.values()] }
  async saveCategory(c) { this.cats.set(c.id, structuredClone(c)) }
  async deleteCategory(id) { this.cats.delete(id); for (const [k, r] of this.recipes) if (r.categoryIds.includes(id)) this.recipes.set(k, { ...r, categoryIds: r.categoryIds.filter((c) => c !== id) }) }
  async getImageBlob(id) { return this.images.get(id)?.blob }
  async exportSnapshot() { return { recipes: [...this.recipes.values()], categories: [...this.cats.values()], images: [...this.images.values()] } }
  async importSnapshot(s, mode) { if (mode === 'replace') { this.recipes.clear(); this.cats.clear(); this.images.clear() } for (const c of s.categories) this.cats.set(c.id, c); for (const r of s.recipes) this.recipes.set(r.id, structuredClone(r)); for (const i of s.images) this.images.set(i.id, i) }
  async outboxList() { return [...this.outbox.values()].map((e) => ({ ...e })) }
  async outboxPut(es) { for (const e of es) this.outbox.set(e.key, e) }
  async outboxClear(es) { for (const e of es) { const n = this.outbox.get(e.key); if (n && n.at === e.at) this.outbox.delete(e.key) } }
  async metaGet(k) { return this.meta.get(k) }
  async metaSet(k, v) { this.meta.set(k, v) }
  async hasImage(id) { return this.images.has(id) }
  async putImageBlob(id, recipeId, b) { this.images.set(id, { id, recipeId, blob: b }) }
  async destroy() {}
}
class MemRemote {
  recipes = new Map(); cats = new Map(); photos = new Map(); tick = 0; down = false; pulls = []; puts = 0
  guard() { if (this.down) throw Object.assign(new Error('network down'), { status: undefined }) }
  stamp() { return String(++this.tick).padStart(10, '0') }
  async pull(since) { this.guard(); this.pulls.push(since); const f = (m) => [...m.values()].filter((r) => !since || r.serverTime >= since).sort((a, b) => a.serverTime.localeCompare(b.serverTime)); const recipes = f(this.recipes), categories = f(this.cats); const all = [...recipes, ...categories].map((r) => r.serverTime).sort(); return { recipes: structuredClone(recipes), categories: structuredClone(categories), cursor: all.length ? all[all.length - 1] : since } }
  upsert(m, row) { const cur = m.get(row.id); if (cur && cur.updatedAt > row.updatedAt) return; m.set(row.id, { ...structuredClone(row), serverTime: this.stamp() }) }
  async putRecipe(row) { this.guard(); this.puts++; this.upsert(this.recipes, row) }
  async putCategory(row) { this.guard(); this.upsert(this.cats, row) }
  async uploadImage(id, b) { this.guard(); this.photos.set(id, b) }
  async downloadImage(id) { this.guard(); return this.photos.get(id) }
  async deleteImage(id) { this.guard(); this.photos.delete(id) }
}
const recipe = (id, title, updatedAt, extra = {}) => ({ id, title, description: '', steps: [], ingredients: [], checked: [], categoryIds: [], imageIds: [], createdAt: 1, updatedAt, ...extra })
function device(remote) { const local = new MemLocal(); const events = { data: 0 }; const store = createSyncedStore(local, remote, { onData: () => events.data++, onStatus: () => {} }); return { local, store, events } }
const settle = () => new Promise((r) => setTimeout(r, 30))

{ // 1. basic round trip
  const remote = new MemRemote(); const A = device(remote), B = device(remote)
  await A.store.saveRecipe(recipe('r1', 'Soup', 100, { checked: ['x'] }))
  check('a change waits in the outbox until it is sent', (await A.local.outboxList()).length === 1 && A.store.status().pending === 1)
  await A.store.sync()
  check('after syncing the outbox is empty and the cloud has it', (await A.local.outboxList()).length === 0 && remote.recipes.get('r1')?.data.title === 'Soup')
  check('ticks (checked) are not sent to the cloud', remote.recipes.get('r1').data.checked.length === 0)
  await B.store.sync()
  const got = await B.store.getRecipe('r1')
  check('another phone gets the recipe', got?.title === 'Soup' && got.checked.length === 0)
  check('screens are told new data arrived', B.events.data >= 1)
  await B.store.setChecked('r1', ['a']); await B.store.sync()
  check('this phone keeps its own ticks after a sync', (await B.store.getRecipe('r1')).checked[0] === 'a')
  await B.store.saveRecipe({ ...got, title: 'Better Soup', updatedAt: 200 }); await B.store.sync(); await A.store.sync()
  check('an edit on the second phone reaches the first', (await A.store.getRecipe('r1')).title === 'Better Soup')
  check('the first phone keeps its ticks', (await A.store.getRecipe('r1')).checked[0] === 'x')
  const pullsBefore = remote.pulls.length; await A.store.sync()
  check('a later pull starts from the saved cursor, not from zero', remote.pulls.at(-1) !== null && remote.pulls.length === pullsBefore + 1, JSON.stringify(remote.pulls))
}
{ // 2. conflict: later edit wins, whoever syncs first
  const remote = new MemRemote(); const A = device(remote), B = device(remote)
  await A.store.saveRecipe(recipe('r1', 'Base', 50)); await A.store.sync(); await B.store.sync()
  remote.down = true
  await A.store.saveRecipe(recipe('r1', 'Edited on A', 100)); await B.store.saveRecipe(recipe('r1', 'Edited on B', 200))
  await A.store.sync(); check('offline: sync reports a problem and keeps the change queued', A.store.status().state === 'error' && A.store.status().pending === 1, JSON.stringify(A.store.status()))
  remote.down = false
  await B.store.sync(); await A.store.sync(); await B.store.sync()
  const a = await A.store.getRecipe('r1'), b = await B.store.getRecipe('r1')
  check('both phones end with the later edit (B at 200)', a.title === 'Edited on B' && b.title === 'Edited on B', `${a.title} / ${b.title}`)
  // old phone comes back after the newer edit is already there
  const C = device(remote); await C.store.sync(); remote.down = true; await C.store.saveRecipe(recipe('r1', 'Stale C', 120)); remote.down = false; await C.store.sync()
  check('an older edit never overwrites a newer one in the cloud', remote.recipes.get('r1').data.title === 'Edited on B')
  check('and the older phone then takes the newer one', (await C.store.getRecipe('r1')).title === 'Edited on B')
}
{ // 3. deletes
  const remote = new MemRemote(); const A = device(remote), B = device(remote)
  await A.store.saveRecipe(recipe('r1', 'Gone soon', 100), { add: [{ id: 'i1', recipeId: 'r1', createdAt: 1, blob: blob('x') }], removeIds: [] })
  await A.store.saveRecipe(recipe('r1', 'Gone soon', 100, { imageIds: ['i1'] }))
  await A.store.sync(); await B.store.sync()
  check('photo travels with the recipe', remote.photos.has('i1'))
  await A.store.deleteRecipe('r1'); await A.store.sync()
  check('delete leaves a marker in the cloud and removes the photo', remote.recipes.get('r1').deleted === true && remote.recipes.get('r1').data === null && !remote.photos.has('i1'))
  await B.store.sync(); check('the other phone removes it too', (await B.store.getRecipe('r1')) === undefined)
  // edit after delete wins
  const C = device(remote); await C.store.saveRecipe(recipe('r2', 'Two', 100)); await C.store.sync(); const D = device(remote); await D.store.sync()
  await C.store.deleteRecipe('r2'); await C.store.sync()
  await new Promise((r) => setTimeout(r, 5))
  await D.store.saveRecipe(recipe('r2', 'Two (kept)', Date.now() + 1000)); await D.store.sync(); await C.store.sync()
  check('an edit made after the delete brings the recipe back everywhere', (await C.store.getRecipe('r2'))?.title === 'Two (kept)')
}
{ // 4. photos
  const remote = new MemRemote(); const A = device(remote), B = device(remote)
  await A.store.saveRecipe(recipe('r1', 'Pic', 100, { imageIds: ['i1'] }), { add: [{ id: 'i1', recipeId: 'r1', createdAt: 1, blob: blob('PIXELS') }], removeIds: [] })
  await A.store.sync(); await B.store.sync(); await settle()
  check('photos are downloaded in the background after a sync', await B.local.hasImage('i1'))
  const C = device(remote); await C.store.sync(); await settle(); C.local.images.clear(); remote.photos.delete('i1'); await C.local.saveRecipe(recipe('r9', 'x', 1, { imageIds: ['i1'] }))
  check('a photo missing in the cloud just shows nothing (no crash)', (await C.store.getImageBlob('i1')) === undefined)
  const D = device(remote); remote.photos.set('i1', blob('LATE')); await D.store.sync(); await D.local.images.clear()
  const lazy = await D.store.getImageBlob('i1'); check('a photo missing on the phone is fetched when shown', !!lazy && D.local.images.has('i1'))
}
{ // 5. categories
  const remote = new MemRemote(); const A = device(remote), B = device(remote)
  await A.store.saveCategory({ id: 'c1', name: 'Sweet', color: '#fff', order: 0 }); await A.store.saveRecipe(recipe('r1', 'Cake', 100, { categoryIds: ['c1'] })); await A.store.sync(); await B.store.sync()
  check('categories sync', (await B.store.listCategories()).length === 1 && (await B.store.getRecipe('r1')).categoryIds[0] === 'c1')
  await A.store.deleteCategory('c1'); await A.store.sync(); await B.store.sync()
  check('deleting a category removes it elsewhere and un-tags recipes', (await B.store.listCategories()).length === 0 && (await B.store.getRecipe('r1')).categoryIds.length === 0)
}
{ // 6. coalescing, samples, restore
  const remote = new MemRemote(); const A = device(remote)
  for (let i = 0; i < 5; i++) await A.store.saveRecipe(recipe('r1', 'v' + i, 100 + i))
  check('five edits of one recipe queue one send', (await A.local.outboxList()).length === 1)
  await A.store.sync(); check('and only the latest version is sent', remote.puts === 1 && remote.recipes.get('r1').data.title === 'v4', String(remote.puts))
  await A.store.saveRecipe(recipe('r2', 'Other', 300)); await A.store.sync()
  await A.store.importSnapshot({ recipes: [recipe('r3', 'Restored', 10)], categories: [], images: [] }, 'replace'); await A.store.sync()
  check('restoring a backup (replace) deletes the rest in the cloud and sends the restored ones', remote.recipes.get('r1').deleted && remote.recipes.get('r2').deleted && remote.recipes.get('r3').data.title === 'Restored')
  const B = device(remote); await B.store.sync(); check('a new phone then sees only the restored recipe', (await B.store.listRecipes()).map((r) => r.title).join() === 'Restored')
  check('samples are never put in the cloud', forCloud({ ...recipe('s', 's', 1), isSample: true }).isSample === undefined)
}
{ // 7. concurrent syncs share one run; a failing pull does not lose the queue
  const remote = new MemRemote(); const A = device(remote)
  await A.store.saveRecipe(recipe('r1', 'x', 1)); const p1 = A.store.sync(), p2 = A.store.sync(); await Promise.all([p1, p2])
  check('overlapping syncs do not send twice', remote.puts === 1, String(remote.puts))
  const bad = new MemRemote(); const E = device(bad); await E.store.saveRecipe(recipe('r1', 'x', 1)); bad.down = true; await E.store.sync(); bad.down = false
  check('after a failure the queue is intact and sends on the next run', (await E.local.outboxList()).length === 1 && (await E.store.sync(), bad.recipes.has('r1')))
}
console.log(`\n${pass}/${pass + fail} passed`)
