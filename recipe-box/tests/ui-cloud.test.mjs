// Drives the real app against tests/mock-supabase.mjs: sign-in, moving this phone's recipes to the account, syncing between
// two phones, offline changes, photos, a second account that must see nothing, and signing out.
// Needs: node tests/mock-supabase.mjs 4020 &  SUPABASE_URL=http://localhost:4020 SUPABASE_ANON_KEY=anon-key RECIPE_IMPORT_PASSCODE=sesame npx vite --port 5200 &
import { createRequire } from 'node:module'
import fs from 'node:fs'
// the Playwright that matches the installed browsers: the machine-wide one if there is one, else the project's
const base = ['/opt/node-tools/package.json', new URL('../package.json', import.meta.url).pathname].find((p) => fs.existsSync(p))
const { chromium } = createRequire(base)('playwright')
import { jwtFor } from './jwt.mjs'

const APP = 'http://localhost:5200', API = 'http://localhost:4020'
let pass = 0, fail = 0
const check = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  -> ' + String(d).slice(0, 300)}`) }
const state = async () => (await fetch(API + '/__state')).json()
const titles = async () => (await state()).recipes.filter((r) => !r.deleted).map((r) => r.data.title).sort()
await fetch(API + '/__reset')

const session = (sub, email, name) => JSON.stringify({ access_token: jwtFor(sub, email), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: { id: sub, aud: 'authenticated', role: 'authenticated', email, user_metadata: { full_name: name }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' } })

const browser = await chromium.launch()
const errors = []
async function phone(sess) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  if (sess) await ctx.addInitScript((s) => { if (!localStorage.getItem('recipe-box-auth') && !sessionStorage.getItem('no-session')) localStorage.setItem('recipe-box-auth', s) }, sess)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  return { ctx, page }
}
const list = async (page) => { await page.locator('ul.grid li').first().waitFor(); await page.waitForTimeout(400); return page.locator('ul.grid li .card__title, ul.grid li h2, ul.grid li h3').allInnerTexts().then((t) => t.map((x) => x.trim()).sort()) }
async function addRecipe(page, title, { photo } = {}) {
  await page.goto(APP + '/recipes/new', { waitUntil: 'networkidle' })
  await page.getByLabel('Title', { exact: true }).fill(title)
  await page.getByLabel('Ingredient 1 quantity').fill('1 cup'); await page.getByLabel('Ingredient 1 name').fill('Flour')
  if (photo) await page.getByTestId('photo-file-input').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: photo })
  if (photo) await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Save recipe' }).click(); await page.getByRole('heading', { name: title, level: 1 }).waitFor()
}
const goBackup = async (page) => { await page.goto(APP + '/backup', { waitUntil: 'networkidle' }) }
const syncLine = (page) => page.getByTestId('sync-line')

// ------------------------------------------------------------------ 0. signed out, configured server
const A = await phone(null)
await A.page.goto(APP + '/', { waitUntil: 'networkidle' }); await A.page.locator('ul.grid li').first().waitFor()
check('signed out: a "sign in" suggestion is shown, the app works as before', await A.page.getByRole('button', { name: 'Sign in with Google' }).first().isVisible() && (await A.page.locator('ul.grid li').count()) >= 3)
await addRecipe(A.page, 'Phone Only Soup'); await addRecipe(A.page, 'Phone Only Cake')
check('nothing reaches the cloud while signed out', (await state()).recipes.length === 0)

// ------------------------------------------------------------------ 1. real sign-in redirect (PKCE) against the mock
await A.page.goto(APP + '/', { waitUntil: 'networkidle' })
await A.page.getByRole('button', { name: 'Sign in with Google' }).first().click()
await A.page.waitForURL((u) => !u.searchParams.has('code') && u.origin === APP, { timeout: 15000 }).catch(() => {})
await A.page.getByText('Add to my account').waitFor({ timeout: 15000 })
check('Google sign-in round trip works and the account is active', true)
check('it offers to add this phone\'s own recipes (samples are not counted)', await A.page.getByText(/This phone has\s*2\s*recipes/).isVisible())
await A.page.getByRole('button', { name: 'Add to my account' }).click()
await A.page.getByText(/2 recipes added to your account/).waitFor()
await goBackup(A.page); await syncLine(A.page).getByText(/All saved/).waitFor({ timeout: 15000 })
check('the two recipes are in the cloud (and no sample recipes)', (await titles()).join('|') === 'Phone Only Cake|Phone Only Soup', (await titles()).join('|'))
check('the account page says everything is saved', await A.page.getByText('Ana', { exact: false }).first().isVisible())
await A.page.goto(APP + '/', { waitUntil: 'networkidle' })
check('after joining the account the list shows the account recipes, without samples', (await list(A.page)).join('|') === 'Phone Only Cake|Phone Only Soup', (await list(A.page)).join('|'))

// ------------------------------------------------------------------ 2. second phone, same account
const B = await phone(session('user-google-1', 'ana@example.com', 'Ana'))
await B.page.goto(APP + '/', { waitUntil: 'networkidle' })
await B.page.getByText('Phone Only Soup').first().waitFor({ timeout: 15000 })
check('a second phone signed in to the same account gets the recipes', (await list(B.page)).join('|') === 'Phone Only Cake|Phone Only Soup', (await list(B.page)).join('|'))
check('and is not asked to add anything (it has nothing of its own)', (await B.page.getByText('Add to my account').count()) === 0)
await B.page.getByText('Phone Only Soup').first().click(); await B.page.getByRole('heading', { name: 'Phone Only Soup', level: 1 }).waitFor()
await B.page.getByRole('link', { name: 'Edit', exact: true }).click(); await B.page.getByLabel('Title', { exact: true }).fill('Soup (edited on B)'); await B.page.getByRole('button', { name: 'Save recipe' }).click()
await B.page.getByRole('heading', { name: 'Soup (edited on B)', level: 1 }).waitFor()
await B.page.waitForTimeout(2200)
check('an edit on phone B reaches the cloud by itself', (await titles()).includes('Soup (edited on B)'), (await titles()).join('|'))
await goBackup(A.page); await A.page.getByRole('button', { name: 'Sync now' }).click(); await A.page.waitForTimeout(800)
await A.page.goto(APP + '/', { waitUntil: 'networkidle' })
check('phone A shows the edit after syncing', (await list(A.page)).includes('Soup (edited on B)'), (await list(A.page)).join('|'))

// ------------------------------------------------------------------ 3. photos
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
await addRecipe(B.page, 'Cake With Photo', { photo: png })
await B.page.waitForTimeout(2500)
check('a photo is uploaded to the account folder', (await state()).photos.some((p) => p.startsWith('user-google-1/')), JSON.stringify((await state()).photos))
await goBackup(A.page); await A.page.getByRole('button', { name: 'Sync now' }).click(); await A.page.waitForTimeout(1200)
await A.page.goto(APP + '/', { waitUntil: 'networkidle' })
await A.page.getByText('Cake With Photo').first().click(); await A.page.getByRole('heading', { name: 'Cake With Photo', level: 1 }).waitFor()
await A.page.waitForTimeout(800)
const shown = await A.page.locator('article img').first().evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false)
check('phone A shows the photo that was added on phone B', shown)

// ------------------------------------------------------------------ 4. offline / server trouble
await fetch(API + '/__fail?on=1')
await addRecipe(A.page, 'Written Offline')
await goBackup(A.page); await A.page.getByRole('button', { name: 'Sync now' }).click(); await A.page.waitForTimeout(600)
check('while the cloud is down the change waits and the app says so', /waiting|Could not sync/.test(await syncLine(A.page).innerText()), await syncLine(A.page).innerText())
check('the recipe is still on the phone', (await (async () => { await A.page.goto(APP + '/', { waitUntil: 'networkidle' }); return list(A.page) })()).includes('Written Offline'))
await fetch(API + '/__fail?on=0')
await goBackup(A.page); await A.page.getByRole('button', { name: 'Sync now' }).click(); await syncLine(A.page).getByText(/All saved/).waitFor({ timeout: 15000 })
check('when it is back the waiting change is uploaded', (await titles()).includes('Written Offline'))

// ------------------------------------------------------------------ 5. another account sees nothing
const C = await phone(session('user-other-2', 'bruno@example.com', 'Bruno'))
await C.page.goto(APP + '/', { waitUntil: 'networkidle' })
await C.page.waitForTimeout(2500)
check('a different account sees none of Ana\'s recipes', (await C.page.getByText('Phone Only Soup').count()) === 0 && (await C.page.getByText('Written Offline').count()) === 0)
await addRecipe(C.page, 'Bruno Pasta'); await C.page.waitForTimeout(2500)
check('and its recipes are stored under its own user', (await state()).recipes.some((r) => r.data?.title === 'Bruno Pasta'))
await goBackup(A.page); await A.page.getByRole('button', { name: 'Sync now' }).click(); await A.page.waitForTimeout(800); await A.page.goto(APP + '/', { waitUntil: 'networkidle' })
check('Ana never sees Bruno\'s recipe', (await A.page.getByText('Bruno Pasta').count()) === 0)

// ------------------------------------------------------------------ 6. delete travels, sign out
await A.page.getByText('Written Offline').first().click(); await A.page.getByRole('heading', { name: 'Written Offline', level: 1 }).waitFor()
await A.page.getByRole('button', { name: /^Delete/ }).first().click(); await A.page.getByRole('button', { name: 'Delete', exact: true }).last().click()
await A.page.waitForTimeout(2500)
check('deleting a recipe marks it deleted in the cloud', (await state()).recipes.some((r) => r.data === null && r.deleted))
await goBackup(B.page); await B.page.getByRole('button', { name: 'Sync now' }).click(); await B.page.waitForTimeout(1000); await B.page.goto(APP + '/', { waitUntil: 'networkidle' })
check('and phone B no longer lists it', (await B.page.getByText('Written Offline').count()) === 0)

await goBackup(A.page); await A.page.getByRole('button', { name: 'Sign out' }).click(); await A.page.getByRole('button', { name: 'Sign out' }).last().click()
await A.page.getByRole('button', { name: 'Sign in with Google' }).first().waitFor({ timeout: 10000 })
await A.page.goto(APP + '/', { waitUntil: 'networkidle' }); await A.page.locator('ul.grid li').first().waitFor()
const afterOut = await list(A.page)
check('signed out: the phone goes back to its own signed-out copy (the account recipes are not left behind)', !afterOut.includes('Cake With Photo') && !afterOut.includes('Soup (edited on B)'), afterOut.join('|'))
check('signing out removes nothing from the cloud', (await titles()).includes('Cake With Photo'))
const dbs = await A.page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))
check('the account\'s copy was removed from the phone', !dbs.some((n) => n?.startsWith('recipe-box-u-')), dbs.join())
check('no page errors', errors.length === 0, errors.join(' | '))
console.log(`\n${pass}/${pass + fail} passed`)
await browser.close()
