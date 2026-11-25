// The signed-out app on a server with no cloud accounts: everything works as before, and the account card says so.
// Needs: RECIPE_IMPORT_PASSCODE=x npx vite --port 5201 &   (no SUPABASE_* variables)
import { createRequire } from 'node:module'
import fs from 'node:fs'
const base = ['/opt/node-tools/package.json', new URL('../package.json', import.meta.url).pathname].find((p) => fs.existsSync(p))
const { chromium } = createRequire(base)('playwright')
const APP = 'http://localhost:5201'
let pass = 0, fail = 0
const check = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  -> ' + String(d).slice(0, 300)}`) }
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true })).newPage()
const errors = []; page.on('pageerror', (e) => errors.push(e.message))
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
await page.goto(APP + '/', { waitUntil: 'networkidle' }); await page.locator('ul.grid li').first().waitFor()
check('sample recipes are there on first run', (await page.locator('ul.grid li').count()) === 3)
check('no sign-in suggestion when the server has no accounts', (await page.getByRole('button', { name: 'Sign in with Google' }).count()) === 0)
// create, tick, edit, scale, delete
await page.goto(APP + '/recipes/new', { waitUntil: 'networkidle' })
await page.getByLabel('Title', { exact: true }).fill('Smoke Soup'); await page.locator('#serv').fill('4')
await page.getByLabel('Ingredient 1 quantity').fill('1 cup'); await page.getByLabel('Ingredient 1 name').fill('Stock')
await page.getByRole('button', { name: 'Save recipe' }).click(); await page.getByRole('heading', { name: 'Smoke Soup', level: 1 }).waitFor()
await page.getByLabel(/Stock/).check(); await page.getByRole('button', { name: 'More servings' }).click(); await page.getByRole('button', { name: 'More servings' }).click(); await page.getByRole('button', { name: 'More servings' }).click(); await page.getByRole('button', { name: 'More servings' }).click()
check('create + tick + servings stepper work', (await page.locator('.checklist li').first().innerText()).includes('2 cups') )
await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('heading', { name: 'Smoke Soup', level: 1 }).waitFor()
check('the recipe and its tick survive a reload', await page.getByLabel(/Stock/).isChecked())
await page.goto(APP + '/backup', { waitUntil: 'networkidle' }); await page.getByText(/Cloud accounts are not set up/).waitFor()
check('backup page: heading, the "stored only on this device" warning and the unconfigured account note', await page.getByRole('heading', { name: 'Account & backup' }).isVisible() && await page.getByText(/stored only in this browser/).isVisible() && await page.getByText(/Cloud accounts are not set up/).isVisible())
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export/ }).first().click()])
const text = fs.readFileSync(await dl.path(), 'utf8'); check('export still works and contains the recipe', text.includes('Smoke Soup'))
await page.goto(APP + '/', { waitUntil: 'networkidle' }); await page.getByText('Smoke Soup').first().click()
await page.getByRole('button', { name: /^Delete/ }).first().click(); await page.getByRole('button', { name: 'Delete', exact: true }).last().click()
await page.waitForURL(APP + '/'); await page.waitForTimeout(500)
check('delete works', (await page.getByText('Smoke Soup').count()) === 0)
// an install from before accounts (database version 1) upgrades without losing anything
{
  const old = await (await browser.newContext()).newPage(); await old.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  await old.goto(APP + '/robots.txt').catch(() => undefined)
  await old.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('recipe-box', 1)
    req.onupgradeneeded = () => { const db = req.result; const r = db.createObjectStore('recipes', { keyPath: 'id' }); r.createIndex('by-createdAt', 'createdAt'); r.createIndex('by-title', 'title'); db.createObjectStore('categories', { keyPath: 'id' }); const i = db.createObjectStore('images', { keyPath: 'id' }); i.createIndex('by-recipe', 'recipeId'); db.createObjectStore('meta') }
    req.onsuccess = () => { const db = req.result; const tx = db.transaction(['recipes', 'meta'], 'readwrite'); tx.objectStore('recipes').put({ id: 'old1', title: 'Made Before Accounts', description: '', steps: [], ingredients: [], checked: [], categoryIds: [], imageIds: [], createdAt: 1, updatedAt: 1 }); tx.objectStore('meta').put(true, 'seeded'); tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => reject(tx.error) }
    req.onerror = () => reject(req.error)
  }))
  await old.goto(APP + '/', { waitUntil: 'networkidle' }); await old.locator('ul.grid li').first().waitFor()
  check('an older install (database v1) upgrades and keeps its recipes', await old.getByText('Made Before Accounts').isVisible())
  await old.getByText('Made Before Accounts').first().click(); await old.getByRole('heading', { name: 'Made Before Accounts', level: 1 }).waitFor()
  await old.getByRole('link', { name: 'Edit', exact: true }).click(); await old.getByLabel('Title', { exact: true }).fill('Still Works'); await old.getByRole('button', { name: 'Save recipe' }).click()
  check('and can be edited after the upgrade', await old.getByRole('heading', { name: 'Still Works', level: 1 }).waitFor({ timeout: 10000 }).then(() => true, () => false))
}
check('no page errors', errors.length === 0, errors.join(' | '))
console.log(`\n${pass}/${pass + fail} passed`); await browser.close()
