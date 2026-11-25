// Signed-in people use the AI without typing a passcode (if their email is on the server's list); others are asked for it.
// Uses the photo search as the AI call: the server answers "PIXABAY_API_KEY is not set" (503) once the caller is let in.
// Needs the servers described in tests/ai-auth.test.mjs (port 5200 + mock supabase on 4020).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { jwtFor } from './jwt.mjs'
const base = ['/opt/node-tools/package.json', new URL('../package.json', import.meta.url).pathname].find((p) => fs.existsSync(p))
const { chromium } = createRequire(base)('playwright')
const APP = 'http://localhost:5200'
let pass = 0, fail = 0
const check = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  -> ' + String(d).slice(0, 250)}`) }
const session = (sub, email, name) => JSON.stringify({ access_token: jwtFor(sub, email), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: { id: sub, aud: 'authenticated', role: 'authenticated', email, user_metadata: { full_name: name }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' } })
const browser = await chromium.launch()
async function open(sess) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  if (sess) await ctx.addInitScript((s) => localStorage.setItem('recipe-box-auth', s), sess)
  const page = await ctx.newPage(); await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  return page
}
async function searchPhotos(page) {
  await page.goto(APP + '/recipes/new', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Find a photo|Search stock photos|Stock photos/i }).first().click()
  await page.getByLabel('Search stock photos').fill('soup')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
}
const ana = await open(session('u1', 'ana@example.com', 'Ana'))
await searchPhotos(ana)
await ana.getByText(/PIXABAY_API_KEY is not set/).waitFor({ timeout: 15000 })
check('an allowed account is let in with no passcode typed (the server got as far as the missing Pixabay key)', true)
check('and the screen did not ask for a passcode', (await ana.getByLabel('Passcode').count()) === 0)
await ana.goto(APP + '/ai', { waitUntil: 'networkidle' }); await ana.getByText(/works through your account/).waitFor({ timeout: 10000 })
check('the AI screen says it works through the account', true)

const bruno = await open(session('u2', 'bruno@example.com', 'Bruno'))
await searchPhotos(bruno)
await bruno.getByText(/not allowed to use the AI|Wrong or missing passcode/).first().waitFor({ timeout: 15000 })
check('an account that is not on the list is told so', true)
await bruno.goto(APP + '/ai', { waitUntil: 'networkidle' })
check('...and then the passcode box shows up as before', await bruno.getByLabel('Passcode').isVisible().catch(() => false))

const guest = await open(null)
await guest.goto(APP + '/ai', { waitUntil: 'networkidle' })
check('signed out: the passcode box is there as always', await guest.getByLabel('Passcode').isVisible())
console.log(`\n${pass}/${pass + fail} passed`); await browser.close()
