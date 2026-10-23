import { useState } from 'react'
import { useImageUrl } from '../hooks/useImageUrl'
import { useSharedElement } from '../lib/nav'
import type { PhotoCredit } from '../types'

function Thumb({ id, index, active, onSelect }: { id: string; index: number; active: boolean; onSelect: () => void }) {
  const url = useImageUrl(id)
  return (
    <button
      type="button"
      className={`gallery__thumb${active ? ' gallery__thumb--on' : ''}`}
      onClick={onSelect}
      aria-label={`Show photo ${index + 1}`}
      aria-pressed={active}
    >
      {url && <img src={url} alt="" />}
    </button>
  )
}

export function ImageGallery({ imageIds, title, recipeId, credits }: { imageIds: string[]; title: string; recipeId: string; credits?: Record<string, PhotoCredit> }) {
  const shared = useSharedElement(`/recipes/${recipeId}`)
  const [index, setIndex] = useState(0)
  const current = imageIds[Math.min(index, imageIds.length - 1)]
  const url = useImageUrl(current)
  if (imageIds.length === 0) return null
  return (
    <section className="gallery" aria-label="Photos">
      <div className="gallery__main" style={shared ? { viewTransitionName: 'recipe-photo' } : undefined}>{url && <img src={url} alt={`Photo of ${title}`} />}</div>
      {credits?.[current] && (
        <p className="muted small gallery__credit">
          Stock photo by{' '}
          <a href={credits[current].url} target="_blank" rel="noopener noreferrer">
            {credits[current].name}
          </a>{' '}
          on{' '}
          <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">
            Pexels
          </a>
        </p>
      )}
      {imageIds.length > 1 && (
        <div className="gallery__thumbs">
          {imageIds.map((id, i) => (
            <Thumb key={id} id={id} index={i} active={i === index} onSelect={() => setIndex(i)} />
          ))}
        </div>
      )}
    </section>
  )
}
