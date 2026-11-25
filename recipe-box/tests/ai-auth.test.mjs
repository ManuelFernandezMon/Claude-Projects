// The AI endpoints accept the shared passcode OR a signed-in account whose email is on AI_ALLOWED_EMAILS.
// /api/photos is used because it authenticates first and then answers 503 (no Pixabay key here): 401 = refused, 503 = let in.
// Needs: node tests/mock-supabase.mjs 4020 &
//   SUPABASE_URL=http://localhost:4020 SUPABASE_ANON_KEY=anon-key RECIPE_IMPORT_PASSCODE=sesame AI_ALLOWED_EMAILS="Ana@example.com, other@example.com" npx vite --port 5200 &
//   SUPABASE_URL=http://localhost:4020 SUPABASE_ANON_KEY=anon-key AI_ALLOWED_EMAILS=ana@example.com npx vite --port 5202 &      (no passcode)
//   SUPABASE_URL=http://localhost:4020 SUPABASE_ANON_KEY=anon-key RECIPE_IMPORT_PASSCODE=sesame npx vite --port 5203 &          (no allow-list)
import { jwtFor } from './jwt.mjs'
let pass = 0, fail = 0
const check = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  -> ' + String(d).slice(0, 200)}`) }
const call = async (port, headers = {}) => (await fetch(`http://localhost:${port}/api/photos`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ query: 'soup' }) })).status
const ana = 'Bearer ' + jwtFor('u1', 'ana@example.com')
const bruno = 'Bearer ' + jwtFor('u2', 'bruno@example.com')
const other = 'Bearer ' + jwtFor('u3', 'OTHER@example.com')
const unconfirmed = 'Bearer ' + jwtFor('u4', 'ana-unconfirmed@example.com')
const userCalls = async () => (await (await fetch('http://localhost:4020/__state')).json()).log.filter((l) => l.startsWith('AUTH user')).length

check('the passcode still works', (await call(5200, { 'x-import-passcode': 'sesame' })) === 503)
check('nothing at all is refused', (await call(5200)) === 401)
check('a wrong passcode is refused', (await call(5200, { 'x-import-passcode': 'nope' })) === 401)
check('an allowed account works without the passcode', (await call(5200, { authorization: ana })) === 503)
check('the list ignores letter case (OTHER vs other)', (await call(5200, { authorization: other })) === 503)
check('a signed-in account that is NOT on the list is refused', (await call(5200, { authorization: bruno })) === 401)
check('a made-up token is refused (it is checked with Supabase, not trusted)', (await call(5200, { authorization: 'Bearer abc.def.ghi' })) === 401)
check('an account whose email is not confirmed is refused', (await call(5200, { authorization: unconfirmed })) === 401)
check('a wrong passcode does not block an allowed account', (await call(5200, { authorization: ana, 'x-import-passcode': 'account' })) === 503)
const before = await userCalls(); await call(5200, { authorization: ana }); await call(5200, { authorization: ana })
check('a good answer from Supabase is remembered, so repeated calls are not slowed down', (await userCalls()) === before, `${before} -> ${await userCalls()}`)
check('with no passcode set on the server, an allowed account works', (await call(5202, { authorization: ana })) === 503)
check('and with no passcode set, nothing at all is refused', (await call(5202)) === 401)
check('with no allow-list, a signed-in account does nothing (only the passcode)', (await call(5203, { authorization: ana })) === 401 && (await call(5203, { 'x-import-passcode': 'sesame' })) === 503)
const pre = await fetch('http://localhost:5200/api/photos', { method: 'OPTIONS', headers: { origin: 'https://localhost', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' } })
check('the Android app may send the Authorization header (CORS)', /authorization/.test(pre.headers.get('access-control-allow-headers') ?? ''), pre.headers.get('access-control-allow-headers'))
console.log(`\n${pass}/${pass + fail} passed`)
