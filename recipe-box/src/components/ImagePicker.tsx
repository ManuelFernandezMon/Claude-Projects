import { useRef, useState } from 'react'
import { compressImage } from '../lib/image'
import { newId } from '../lib/id'
import { useObjectUrl } from '../hooks/useImageUrl'
import { errorMessage } from '../lib/format'
import { PhotoSearch } from './PhotoSearch'

export interface ImageItem {
  id: string
  blob: Blob
  /** Set for stock photos: who took it and where it came from. */
  credit?: { name: string; url: string }
}

interface Props {
  items: ImageItem[]
  onChange: (items: ImageItem[]) => void
  /** Recipe title, used as the starting search for stock photos. */
  title?: string
}

function PickerThumb({
  item,
  index,
  isCover,
  onMakeCover,
  onRemove,
}: {
  item: ImageItem
  index: number
  isCover: boolean
  onMakeCover: () => void
  onRemove: () => void
}) {
  const url = useObjectUrl(item.blob)
  return (
    <li className="picker__item">
      <div className="picker__img">{url && <img src={url} alt={`Photo ${index + 1}`} />}</div>
      {isCover && <span className="badge badge--accent">COVER</span>}
      <div className="picker__actions">
        {!isCover && (
          <button type="button" className="btn btn--small" onClick={onMakeCover}>
            Make cover
          </button>
        )}
        <button type="button" className="btn btn--small btn--danger-ghost" onClick={onRemove} aria-label={`Remove photo ${index + 1}`}>
          Remove
        </button>
      </div>
    </li>
  )
}

export function ImagePicker({ items, onChange, title = '' }: Props) {
  const [finding, setFinding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFiles(input: HTMLInputElement) {
    const files = Array.from(input.files ?? [])
    input.value = '' // allow picking the same file again
    if (files.length === 0) return
    setBusy(true)
    setError(undefined)
    const added: ImageItem[] = []
    const errors: string[] = []
    for (const f of files) {
      try {
        added.push({ id: newId(), blob: await compressImage(f) })
      } catch (e) {
        errors.push(errorMessage(e))
      }
    }
    if (added.length) onChange([...items, ...added])
    if (errors.length) setError(errors.join(' '))
    setBusy(false)
  }

  return (
    <div>
      <div className="row">
        <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          Add photos
        </button>
        <button type="button" className="btn" onClick={() => cameraRef.current?.click()} disabled={busy}>
          Take photo
        </button>
        <button type="button" className="btn" onClick={() => setFinding((v) => !v)} aria-expanded={finding} disabled={busy}>
          Find a photo
        </button>
        {busy && (
          <span className="muted" role="status">
            Processing…
          </span>
        )}
      </div>
      {finding && (
        <PhotoSearch
          initialQuery={title}
          onClose={() => setFinding(false)}
          onPick={async (file, credit) => {
            const blob = await compressImage(file)
            onChange([...items, { id: newId(), blob, credit }])
            setFinding(false)
          }}
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="photo-file-input"
        onChange={(e) => void handleFiles(e.target)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void handleFiles(e.target)}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {items.length > 0 && (
        <ul className="picker">
          {items.map((item, i) => (
            <PickerThumb
              key={item.id}
              item={item}
              index={i}
              isCover={i === 0}
              onMakeCover={() => onChange([item, ...items.filter((x) => x.id !== item.id)])}
              onRemove={() => onChange(items.filter((x) => x.id !== item.id))}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
