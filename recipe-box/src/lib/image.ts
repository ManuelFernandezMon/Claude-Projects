const MAX_SIDE = 1600
const JPEG_QUALITY = 0.8

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Fallback for browsers where createImageBitmap rejects the file or options.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/** Resizes to at most 1600px on the longest side and re-encodes as JPEG (quality 0.8). */
export async function compressImage(file: Blob & { name?: string }, maxSide = MAX_SIDE, quality = JPEG_QUALITY): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await decode(file)
  } catch {
    throw new Error(`"${file.name ?? 'That file'}" could not be read as an image on this browser.`)
  }
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  ctx.fillStyle = '#fff' // JPEG has no alpha; avoid black backgrounds for PNGs
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  if ('close' in source) source.close()
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) throw new Error(`"${file.name ?? 'That file'}" could not be compressed.`)
  return blob
}
