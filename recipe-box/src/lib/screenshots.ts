import { compressImage } from './image'

export const MAX_SCREENSHOTS = 6
/** The request has to fit in 4.5 MB (a Vercel limit), so the pictures together are kept under this many base64 characters. */
const MAX_TOTAL_CHARS = 3_600_000

export interface Screenshot {
  id: string
  name: string
  /** JPEG, already shrunk. */
  blob: Blob
}

/** Reads and shrinks a picture right away (a phone's picker permission can lapse a few seconds after choosing). */
export async function prepareScreenshot(file: File, id: string): Promise<Screenshot> {
  return { id, name: file.name || 'screenshot', blob: await compressImage(file, 1400, 0.8) }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read a screenshot.'))
    reader.readAsDataURL(blob)
  })
}

/** Base64 pictures ready to send. If they are too big together they are shrunk further (text stays readable at 1000 px). */
export async function encodeScreenshots(shots: Screenshot[]): Promise<{ mimeType: string; data: string }[]> {
  let blobs = shots.map((s) => s.blob)
  for (const [side, quality] of [[0, 0], [1100, 0.72], [900, 0.65]] as const) {
    if (side) blobs = await Promise.all(blobs.map((b) => compressImage(b, side, quality)))
    const data = await Promise.all(blobs.map(blobToBase64))
    if (data.reduce((n, d) => n + d.length, 0) <= MAX_TOTAL_CHARS) return data.map((d) => ({ mimeType: 'image/jpeg', data: d }))
  }
  throw new Error('The screenshots are too large together. Remove some and try again.')
}
