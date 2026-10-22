import { createHmac, timingSafeEqual } from 'node:crypto'
import { FileState, type GoogleGenAI } from '@google/genai'

/** Resumable-upload protocol as used by the official SDK (@google/genai) and Google's Files API docs. */
const baseUrl = () => (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '')

export interface UploadedFile {
  name: string
  uri: string
  mimeType: string
}

/** Starts a resumable upload and returns the session URL (a capability: it carries the upload id, not the API key). */
export async function startUpload(opts: { mimeType: string; size: number; displayName: string }): Promise<string> {
  const res = await fetch(`${baseUrl()}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY ?? '',
      'content-type': 'application/json',
      'x-goog-upload-protocol': 'resumable',
      'x-goog-upload-command': 'start',
      'x-goog-upload-header-content-length': String(opts.size),
      'x-goog-upload-header-content-type': opts.mimeType,
    },
    body: JSON.stringify({ file: { display_name: opts.displayName } }),
  })
  if (!res.ok) {
    // Google answers a bad key with HTTP 400 "API key not valid", so look at the body too.
    const text = await res.text().catch(() => '')
    throw new UploadError(/api key/i.test(text) ? 401 : res.status, `start failed: HTTP ${res.status}`)
  }
  const url = res.headers.get('x-goog-upload-url')
  if (!url) throw new UploadError(502, 'start failed: no upload URL returned')
  return withoutKey(url)
}

/**
 * Upload session URLs may carry the API key as a `key=` query parameter. The URL is later signed into a token the browser
 * holds, so strip the key here; chunk forwards authenticate with the x-goog-api-key header instead.
 */
export function withoutKey(url: string): string {
  const u = new URL(url)
  u.searchParams.delete('key')
  const clean = u.toString()
  const key = process.env.GEMINI_API_KEY
  if (key && clean.includes(key)) throw new UploadError(502, 'upload URL contains the API key')
  return clean
}

/** Sends one chunk. Non-final chunks must be multiples of 256 KiB (enforced by the caller). */
export async function sendChunk(
  uploadUrl: string,
  offset: number,
  bytes: Uint8Array,
  final: boolean,
): Promise<{ status: string; file?: UploadedFile }> {
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY ?? '',
      'x-goog-upload-command': final ? 'upload, finalize' : 'upload',
      'x-goog-upload-offset': String(offset),
      'content-length': String(bytes.length),
    },
    body: bytes as BodyInit,
  })
  if (!res.ok) throw new UploadError(res.status, `chunk failed: HTTP ${res.status}`)
  const status = res.headers.get('x-goog-upload-status') ?? ''
  if (!final) return { status }
  const data = (await res.json().catch(() => ({}))) as { file?: { name?: string; uri?: string; mimeType?: string } }
  const f = data.file
  if (!f?.name || !f.uri || !f.mimeType) throw new UploadError(502, 'finalize returned no file')
  return { status, file: { name: f.name, uri: f.uri, mimeType: f.mimeType } }
}

export class UploadError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Polls until the uploaded video is ACTIVE. Returns false on FAILED or timeout. */
export async function waitUntilActive(ai: GoogleGenAI, name: string, timeoutMs: number): Promise<boolean> {
  const until = Date.now() + timeoutMs
  for (;;) {
    const f = await ai.files.get({ name })
    if (f.state === FileState.ACTIVE) return true
    if (f.state === FileState.FAILED) return false
    if (Date.now() > until) return false
    await new Promise((r) => setTimeout(r, Number(process.env.GEMINI_FILE_POLL_MS ?? 1500)))
  }
}

export async function deleteFile(ai: GoogleGenAI, name: string): Promise<void> {
  try {
    await ai.files.delete({ name })
  } catch {
    /* best effort: Google also deletes uploads after 48 hours */
  }
}

// --- signed upload tokens: the browser can only continue sessions this server started -------------------------

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const mac = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url')

export function signUploadUrl(url: string, secret: string): string {
  const payload = b64(url)
  return `${payload}.${mac(payload, secret)}`
}

export function verifyUploadToken(token: string, secret: string): string | undefined {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return undefined
  const expected = mac(payload, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined
  return Buffer.from(payload, 'base64url').toString('utf8')
}

export const uploadBase = baseUrl
