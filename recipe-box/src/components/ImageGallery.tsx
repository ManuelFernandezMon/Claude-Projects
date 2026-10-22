import { useState } from 'react'
import { useImageUrl } from '../hooks/useImageUrl'

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

export function ImageGallery({ imageIds, title }: { imageIds: string[]; title: string }) {
  const [index, setIndex] = useState(0)
  const current = imageIds[Math.min(index, imageIds.length - 1)]
  const url = useImageUrl(current)
  if (imageIds.length === 0) return null
  return (
    <section className="gallery" aria-label="Photos">
      <div className="gallery__main">{url && <img src={url} alt={`Photo of ${title}`} />}</div>
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
