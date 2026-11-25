import { json } from './shared.js'

/**
 * GET /api/config: tells the app where its cloud accounts live (a Supabase project). The URL and the "anon" key are public by
 * design (every Supabase web app ships them; the database rules decide who can read what), so no passcode is asked.
 * Keeping them on the server means the Android app needs no rebuild when they change.
 */
export async function handleCloudConfig(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed', message: 'Use GET.' })
  const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const key = (process.env.SUPABASE_ANON_KEY ?? '').trim()
  let ok = false
  try {
    const u = new URL(url)
    ok = (u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'))) && !!key
  } catch {
    ok = false
  }
  if (!ok) return json(200, { configured: false })
  return json(200, { configured: true, supabaseUrl: url, supabaseAnonKey: key })
}
