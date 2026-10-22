import { useEffect, useState } from 'react'
import { recipeStore } from '../storage/recipeStore'

/** Creates an object URL for a Blob and revokes it when the Blob changes or the component unmounts. */
export function useObjectUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

/** Loads a stored image by id and returns a displayable URL (undefined while loading). */
export function useImageUrl(imageId?: string): string | undefined {
  const [blob, setBlob] = useState<Blob>()
  useEffect(() => {
    let cancelled = false
    setBlob(undefined)
    if (imageId) {
      recipeStore
        .getImageBlob(imageId)
        .then((b) => {
          if (!cancelled) setBlob(b)
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
  }, [imageId])
  return useObjectUrl(blob)
}
