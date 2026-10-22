import type { ImportedRecipe } from '../types'
import { ImportError, postAi } from './importApi'

export const MAX_VIDEO_MB = 100
export const MAX_VIDEO_MINUTES = 5

export interface UploadedVideo {
  name: string
  uri: string
  mimeType: string
}

const BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  avi: 'video/x-msvideo',
}

/** Some Android file pickers return an empty MIME type, so fall back to the extension. */
export function videoMime(file: File): string {
  if (file.type.startsWith('video/')) return file.type
  return BY_EXTENSION[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? ''
}

/** Reads the duration from the file's metadata; undefined if the browser cannot decode it quickly. */
export function readDuration(file: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = (v?: number) => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      resolve(v)
    }
    const timer = setTimeout(() => done(undefined), 4000)
    video.preload = 'metadata'
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : undefined)
    video.onerror = () => done(undefined)
    video.src = url
  })
}

async function post<T>(endpoint: string, init: RequestInit, passcode: string, step: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(endpoint, { ...init, method: 'POST', headers: { 'x-import-passcode': passcode, ...init.headers } })
  } catch (e) {
    const cause = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    throw new ImportError(`The connection dropped while ${step}. Check your signal and try again.`, 'network', `${step} · ${cause}`)
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string } & T
  if (!res.ok) {
    const fallback =
      res.status === 404
        ? 'The upload endpoint was not found. It only exists on Vercel or in `npm run dev`.'
        : `Upload failed (HTTP ${res.status}).`
    throw new ImportError(body.message ?? fallback, body.error ?? 'http', `${step} · HTTP ${res.status}`)
  }
  return body
}

export interface LoadedVideo {
  name: string
  mimeType: string
  bytes: ArrayBuffer
  durationSec?: number
}

const UNREADABLE =
  'Your phone gave the browser a video it cannot read. Try the other choose button (Files instead of Photos), ' +
  'or save the video to Downloads and pick it from there.'

/**
 * Validates the file and reads ALL of it into memory right away. Android's photo picker hands the browser a temporary
 * permission that can lapse a few seconds later, so every later step (duration, upload) works from this copy and never
 * touches the original file again.
 */
export async function loadVideo(file: File): Promise<LoadedVideo> {
  const mimeType = videoMime(file)
  if (!mimeType) throw new ImportError('That does not look like a video file.', 'bad_request')
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new ImportError(`The video is too large (max ${MAX_VIDEO_MB} MB). Try a shorter clip.`, 'too_large')
  }
  let bytes: ArrayBuffer
  try {
    bytes = await file.arrayBuffer()
  } catch (e) {
    throw new ImportError(UNREADABLE, 'file_unreadable', `reading the file · ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`)
  }
  if (bytes.byteLength === 0) throw new ImportError('The video file is empty.', 'bad_request')
  const durationSec = await readDuration(new Blob([bytes], { type: mimeType }))
  if (durationSec && durationSec > MAX_VIDEO_MINUTES * 60) {
    throw new ImportError(`The video is too long (max ${MAX_VIDEO_MINUTES} minutes).`, 'too_long')
  }
  return { name: file.name, mimeType, bytes, durationSec }
}

/** One chunk straight to Google's resumable-upload URL. XMLHttpRequest (not fetch) because it reports upload progress. */
function sendChunk(
  url: string,
  offset: number,
  body: ArrayBuffer,
  final: boolean,
  onSent: (bytes: number) => void,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('X-Goog-Upload-Command', final ? 'upload, finalize' : 'upload')
    xhr.setRequestHeader('X-Goog-Upload-Offset', String(offset))
    xhr.upload.onprogress = (e) => onSent(e.loaded)
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText })
    xhr.onerror = () => reject(new Error('request failed (connection dropped, or blocked by the browser)'))
    xhr.ontimeout = () => reject(new Error('request timed out'))
    xhr.send(body)
  })
}

/**
 * Uploads the in-memory video. The server only opens the session (it holds the Gemini key); the bytes go from the browser
 * straight to Google in chunks of the size Google dictates (8 MiB multiples), which could not pass through a Vercel
 * function. Progress is reported from 0 to 1.
 */
export async function uploadVideo(
  video: LoadedVideo,
  passcode: string,
  onProgress: (fraction: number) => void,
): Promise<UploadedVideo> {
  const size = video.bytes.byteLength
  const start = await post<{ uploadUrl: string; chunkSize: number }>(
    '/api/video-start',
    { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mimeType: video.mimeType, size, durationSec: video.durationSec }) },
    passcode,
    'starting the upload',
  )

  const parts = Math.ceil(size / start.chunkSize)
  let offset = 0
  while (offset < size) {
    const end = Math.min(offset + start.chunkSize, size)
    const final = end === size
    const part = offset / start.chunkSize + 1
    const step = `sending part ${part} of ${parts}`
    const body = video.bytes.slice(offset, end)
    let attempt = 0
    for (;;) {
      try {
        let res: { status: number; text: string }
        try {
          res = await sendChunk(start.uploadUrl, offset, body, final, (sent) => onProgress((offset + sent) / size))
        } catch (e) {
          throw new ImportError(
            `The connection dropped while ${step}. Check your signal and try again.`,
            'network',
            `${step} · ${e instanceof Error ? e.message : String(e)}`,
          )
        }
        if (res.status < 200 || res.status >= 300) {
          const retryable = res.status === 429 || res.status >= 500
          throw new ImportError(
            `Google did not accept the upload (${step}).`,
            retryable ? 'network' : 'upload_rejected',
            `${step} · HTTP ${res.status} ${res.text.replace(/\s+/g, ' ').slice(0, 160)}`,
          )
        }
        onProgress(end / size)
        if (final) {
          let file: Partial<UploadedVideo> | undefined
          try {
            file = (JSON.parse(res.text) as { file?: Partial<UploadedVideo> }).file
          } catch {
            /* handled below */
          }
          if (!file?.name || !file.uri || !file.mimeType) {
            throw new ImportError('The upload finished but Google did not confirm it. Try again.', 'upload_incomplete', `${step} · ${res.text.slice(0, 160)}`)
          }
          return { name: file.name, uri: file.uri, mimeType: file.mimeType }
        }
        break
      } catch (e) {
        // Only dropped connections and Google 5xx/429 are worth retrying: other answers will not change.
        if (!(e instanceof ImportError) || e.code !== 'network' || ++attempt >= 4) throw e
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
    offset = end
  }
  throw new ImportError('The video file is empty.', 'bad_request')
}

export function extractVideo(
  input: { file: UploadedVideo; url?: string; categories: string[] },
  passcode: string,
): Promise<ImportedRecipe | null> {
  return postAi('/api/video-extract', input, passcode)
}
