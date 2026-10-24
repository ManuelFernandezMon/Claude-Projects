import { apiUrl } from './apiBase'
import { ImportError } from './importApi'

export interface StockPhoto {
  id: string
  thumb: string
  image: string
  page: string
  photographer: string
  alt: string
}

/** Searches Pixabay through our server (the API key lives there). */
export async function searchPhotos(query: string, passcode: string): Promise<StockPhoto[]> {
  let res: Response
  try {
    res = await fetch(apiUrl('/api/photos'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-import-passcode': passcode },
      body: JSON.stringify({ query }),
    })
  } catch {
    throw new ImportError('Could not reach the server. Finding photos needs an internet connection.', 'network')
  }
  const body: { photos?: StockPhoto[]; error?: string; message?: string } = await res.json().catch(() => ({}))
  if (!res.ok) {
    const fallback = res.status === 404 ? 'The photo endpoint was not found. It only exists on Vercel or in `npm run dev`.' : `Request failed (HTTP ${res.status}).`
    throw new ImportError(body.message ?? fallback, body.error ?? 'http')
  }
  return Array.isArray(body.photos) ? body.photos : []
}

/**
 * Downloads the chosen photo so the recipe keeps its own copy (it keeps working offline). Tries Pixabay's server
 * directly, and asks our server to fetch it when the browser is not allowed to.
 */
export async function downloadPhoto(url: string, passcode: string): Promise<File> {
  let blob: Blob | undefined
  try {
    const res = await fetch(url)
    if (res.ok) blob = await res.blob()
  } catch {
    /* blocked or offline: try through our server below */
  }
  if (!blob || !blob.type.startsWith('image/')) {
    let res: Response
    try {
      res = await fetch(apiUrl('/api/photos'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-import-passcode': passcode },
        body: JSON.stringify({ download: url }),
      })
    } catch {
      throw new ImportError('Could not download that photo. Check your connection and try again.', 'network')
    }
    if (!res.ok) {
      const body: { message?: string } = await res.json().catch(() => ({}))
      throw new ImportError(body.message ?? `Could not download that photo (HTTP ${res.status}).`, 'http')
    }
    blob = await res.blob()
  }
  return new File([blob], 'stock-photo.jpg', { type: blob.type || 'image/jpeg' })
}
