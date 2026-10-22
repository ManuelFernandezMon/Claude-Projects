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
export function readDuration(file: File): Promise<number | undefined> {
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

async function post<T>(endpoint: string, init: RequestInit, passcode: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(endpoint, { ...init, method: 'POST', headers: { 'x-import-passcode': passcode, ...init.headers } })
  } catch {
    throw new ImportError('Network error while uploading. Check your connection and try again.', 'network')
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string } & T
  if (!res.ok) {
    const fallback =
      res.status === 404
        ? 'The upload endpoint was not found. It only exists on Vercel or in `npm run dev`.'
        : `Upload failed (HTTP ${res.status}).`
    throw new ImportError(body.message ?? fallback, body.error ?? 'http')
  }
  return body
}

/** Uploads the file through the server (which holds the Gemini key) in chunks, reporting progress from 0 to 1. */
export async function uploadVideo(
  file: File,
  passcode: string,
  onProgress: (fraction: number) => void,
): Promise<UploadedVideo> {
  const mimeType = videoMime(file)
  if (!mimeType) throw new ImportError('That does not look like a video file.', 'bad_request')
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new ImportError(`The video is too large (max ${MAX_VIDEO_MB} MB). Try a shorter clip.`, 'too_large')
  }
  const durationSec = await readDuration(file)
  if (durationSec && durationSec > MAX_VIDEO_MINUTES * 60) {
    throw new ImportError(`The video is too long (max ${MAX_VIDEO_MINUTES} minutes).`, 'too_long')
  }

  const start = await post<{ uploadToken: string; chunkSize: number }>(
    '/api/video-start',
    { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mimeType, size: file.size, durationSec }) },
    passcode,
  )

  let offset = 0
  while (offset < file.size) {
    const end = Math.min(offset + start.chunkSize, file.size)
    const final = end === file.size
    const body = file.slice(offset, end)
    let attempt = 0
    for (;;) {
      try {
        const r = await post<{ done: boolean; file?: UploadedVideo }>(
          '/api/video-chunk',
          {
            headers: {
              'content-type': 'application/octet-stream',
              'x-upload-token': start.uploadToken,
              'x-upload-offset': String(offset),
              'x-upload-final': final ? '1' : '0',
            },
            body,
          },
          passcode,
        )
        onProgress(end / file.size)
        if (final) {
          if (!r.file) throw new ImportError('The upload did not finish. Try again.', 'upload_incomplete')
          return r.file
        }
        break
      } catch (e) {
        // Only a dropped connection is worth retrying: any server answer (bad token, offset...) will not change.
        if (!(e instanceof ImportError) || e.code !== 'network' || ++attempt >= 3) throw e
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
