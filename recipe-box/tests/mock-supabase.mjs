// A small stand-in for a Supabase project, just enough for the app's sync to run against: PostgREST reads, the two upsert
// functions (later edit wins), private photo storage per user, and the Google sign-in redirect with PKCE.
// Usage: node tests/mock-supabase.mjs [port]
import http from 'node:http'
import { jwtFor } from './jwt.mjs'

const PORT = Number(process.argv[2] || 4020)
const ANON = 'anon-key'

const tables = { recipes: new Map(), categories: new Map() } // key: user + "/" + id
const photos = new Map() // key: path (uid/id) -> { bytes, type }
let tick = 0
let failing = false
const log = []


function userOf(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
  if (!m || req.headers.apikey !== ANON) return null
  try {
    const p = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString())
    return p.sub ? p.sub : null
  } catch {
    return null
  }
}

const stamp = () => new Date(Date.UTC(2026, 10, 25, 12, 0, 0) + ++tick).toISOString().replace('Z', '000+00:00')

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

/** The file inside a multipart upload (the second part; the first is cacheControl). */
function fileOfMultipart(body, contentType) {
  const boundary = /boundary=(.+)$/.exec(contentType ?? '')?.[1]
  if (!boundary) return { bytes: body, type: contentType }
  const text = body.toString('latin1')
  const parts = text.split('--' + boundary).slice(1, -1)
  for (const part of parts) {
    const head = part.indexOf('\r\n\r\n')
    const headers = part.slice(0, head)
    if (!/Content-Type/i.test(headers)) continue
    const type = /Content-Type:\s*([^\r\n]+)/i.exec(headers)?.[1]
    const raw = part.slice(head + 4, part.endsWith('\r\n') ? -2 : undefined)
    return { bytes: Buffer.from(raw, 'latin1'), type }
  }
  return { bytes: body, type: undefined }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const cors = {
    'access-control-allow-origin': req.headers.origin ?? '*',
    'access-control-allow-headers': req.headers['access-control-request-headers'] ?? '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-expose-headers': '*',
    vary: 'Origin',
  }
  const send = (status, body, extra = {}) => {
    res.writeHead(status, { ...cors, ...(typeof body === 'string' || Buffer.isBuffer(body) ? {} : { 'content-type': 'application/json' }), ...extra })
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
  }
  if (req.method === 'OPTIONS') return send(204, '')

  // ---- test controls
  if (url.pathname === '/__state') return send(200, { recipes: [...tables.recipes.values()], categories: [...tables.categories.values()], photos: [...photos.keys()], log })
  if (url.pathname === '/__fail') { failing = url.searchParams.get('on') === '1'; return send(200, { failing }) }
  if (url.pathname === '/__reset') { tables.recipes.clear(); tables.categories.clear(); photos.clear(); log.length = 0; failing = false; return send(200, {}) }

  // ---- Google sign-in with PKCE: /authorize bounces straight back with a code, /token turns it into a session
  if (url.pathname === '/auth/v1/authorize') {
    const back = new URL(url.searchParams.get('redirect_to') ?? 'http://localhost/')
    back.searchParams.set('code', 'code-' + (url.searchParams.get('code_challenge') ?? 'x').slice(0, 8))
    return send(302, '', { location: back.toString() })
  }
  if (url.pathname === '/auth/v1/token') {
    const sub = 'user-google-1'
    const access = jwtFor(sub, 'ana@example.com')
    return send(200, {
      access_token: access, refresh_token: 'refresh-1', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
      user: { id: sub, aud: 'authenticated', role: 'authenticated', email: 'ana@example.com', user_metadata: { full_name: 'Ana' }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
    })
  }
  if (url.pathname === '/auth/v1/user') {
    const sub = userOf(req)
    log.push('AUTH user ' + (sub ?? 'rejected'))
    if (!sub) return send(401, { message: 'invalid JWT' })
    const email = JSON.parse(Buffer.from(req.headers.authorization.slice(7).split('.')[1], 'base64url').toString()).email
    return send(200, { id: sub, email, ...(email.includes('unconfirmed') ? {} : { email_confirmed_at: '2026-01-01T00:00:00Z' }) })
  }
  if (url.pathname === '/auth/v1/logout') return send(204, '')
  if (url.pathname.startsWith('/auth/')) return send(200, {})

  const uid = userOf(req)
  if (failing) return send(503, { message: 'down for the test' })
  if (!uid) return send(401, { message: 'JWT missing or wrong key', code: 'PGRST301' })

  // ---- PostgREST
  const rest = /^\/rest\/v1\/(recipes|categories)$/.exec(url.pathname)
  if (rest && req.method === 'GET') {
    const since = url.searchParams.get('server_time')?.replace(/^gte\./, '')
    const limit = Number(url.searchParams.get('limit') ?? 1000)
    const rows = [...tables[rest[1]].entries()]
      .filter(([k]) => k.startsWith(uid + '/'))
      .map(([, v]) => v)
      .filter((r) => !since || r.server_time >= since)
      .sort((a, b) => a.server_time.localeCompare(b.server_time))
      .slice(0, limit)
      .map(({ id, data, deleted, updated_at, server_time }) => ({ id, data, deleted, updated_at, server_time }))
    log.push(`GET ${rest[1]} since=${since ?? '-'} -> ${rows.length}`)
    return send(200, rows)
  }
  const rpc = /^\/rest\/v1\/rpc\/upsert_(recipe|category)$/.exec(url.pathname)
  if (rpc && req.method === 'POST') {
    const p = JSON.parse((await readBody(req)).toString())
    const table = tables[rpc[1] === 'recipe' ? 'recipes' : 'categories']
    const key = uid + '/' + p.p_id
    const cur = table.get(key)
    log.push(`RPC ${rpc[1]} ${p.p_id} ${p.p_deleted ? 'deleted' : p.p_data?.title ?? p.p_data?.name} @${p.p_updated_at}${cur && cur.updated_at > p.p_updated_at ? ' (older: ignored)' : ''}`)
    if (!cur || cur.updated_at <= p.p_updated_at) table.set(key, { id: p.p_id, data: p.p_data, deleted: p.p_deleted, updated_at: p.p_updated_at, server_time: stamp() })
    return send(200, '')
  }

  // ---- storage
  const obj = /^\/storage\/v1\/object\/photos\/(.+)$/.exec(url.pathname)
  if (obj) {
    const path = decodeURIComponent(obj[1])
    if (!path.startsWith(uid + '/')) return send(403, { message: 'not your folder', statusCode: '403' })
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await readBody(req)
      photos.set(path, fileOfMultipart(body, req.headers['content-type']))
      log.push(`PHOTO put ${path} ${photos.get(path).bytes.length}b`)
      return send(200, { Id: 'x', Key: 'photos/' + path })
    }
    if (req.method === 'GET') {
      const f = photos.get(path)
      if (!f) return send(400, { message: 'Object not found', statusCode: '404', error: 'not_found' })
      return send(200, f.bytes, { 'content-type': f.type ?? 'application/octet-stream' })
    }
  }
  if (url.pathname === '/storage/v1/object/photos' && req.method === 'DELETE') {
    const { prefixes } = JSON.parse((await readBody(req)).toString())
    for (const p of prefixes) if (p.startsWith(uid + '/')) { photos.delete(p); log.push(`PHOTO delete ${p}`) }
    return send(200, [])
  }
  return send(404, { message: 'mock: unknown ' + req.method + ' ' + url.pathname })
})

server.listen(PORT, () => console.log(`mock supabase on ${PORT}`))
