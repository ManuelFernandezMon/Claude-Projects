import { FileState, type GoogleGenAI } from '@google/genai'

/** Resumable-upload protocol as used by the official SDK (@google/genai) and Google's Files API docs. */
const baseUrl = () => (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '')

export interface UploadedFile {
  name: string
  uri: string
  mimeType: string
}

/** Scotty-style resumable uploads require every non-final chunk to be a multiple of this (8 MiB is what the official SDK uses). */
export const DEFAULT_GRANULARITY = 8 * 1024 * 1024

/**
 * Starts a resumable upload. Returns the session URL and the chunk granularity the browser must respect. The session URL
 * is a capability (it carries the upload id, not the API key), so the browser can upload straight to Google with it.
 */
export async function startUpload(opts: {
  mimeType: string
  size: number
  displayName: string
}): Promise<{ url: string; granularity: number }> {
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
  const g = Number(res.headers.get('x-goog-upload-chunk-granularity'))
  return { url: withoutKey(url), granularity: Number.isInteger(g) && g >= 256 * 1024 ? g : DEFAULT_GRANULARITY }
}

/**
 * Upload session URLs may carry the API key as a `key=` query parameter. The URL is handed to the browser, so strip the key
 * here and refuse to continue if the key is still visible in it.
 */
export function withoutKey(url: string): string {
  const u = new URL(url)
  u.searchParams.delete('key')
  const clean = u.toString()
  const key = process.env.GEMINI_API_KEY
  if (key && clean.includes(key)) throw new UploadError(502, 'upload URL contains the API key')
  return clean
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

export const uploadBase = baseUrl
