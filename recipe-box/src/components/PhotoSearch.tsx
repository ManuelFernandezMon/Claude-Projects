import { useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { usePasscode } from '../hooks/usePasscode'
import { ImportError } from '../lib/importApi'
import { downloadPhoto, searchPhotos, type StockPhoto } from '../lib/photoApi'
import { errorMessage } from '../lib/format'
import { PasscodeField } from './PasscodeField'

interface Props {
  /** Starting search text, usually the recipe title. */
  initialQuery: string
  /** Receives the downloaded photo and who took it. Rejects to show an error here. */
  onPick: (file: File, credit: { name: string; url: string }) => Promise<void>
  onClose: () => void
}

export function PhotoSearch({ initialQuery, onPick, onClose }: Props) {
  const pc = usePasscode()
  const [query, setQuery] = useState(initialQuery.trim())
  const [results, setResults] = useState<StockPhoto[]>()
  const [usedQuery, setUsedQuery] = useState('')
  /** The words that were searched (not what is typed in the box now). */
  const [searched, setSearched] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState<'search' | string>()
  const [error, setError] = useState<string>()

  const canSearch = busy === undefined && query.trim().length >= 2 && pc.passcode !== ''

  async function search() {
    setBusy('search')
    setError(undefined)
    try {
      const found = await searchPhotos(query.trim(), pc.passcode)
      pc.remember()
      setResults(found.photos)
      setUsedQuery(found.usedQuery)
      setSearched(query.trim())
      setPage(1)
      setHasMore(found.hasMore)
    } catch (e) {
      if (e instanceof ImportError && e.code === 'unauthorized') pc.forget()
      setError(errorMessage(e))
    } finally {
      setBusy(undefined)
    }
  }

  async function more() {
    setBusy('more')
    setError(undefined)
    try {
      const next = await searchPhotos(usedQuery, pc.passcode, { page: page + 1 })
      // never show the same photo twice if the pages overlap
      setResults((prev) => [...(prev ?? []), ...next.photos.filter((p) => !(prev ?? []).some((q) => q.id === p.id))])
      setPage(page + 1)
      setHasMore(next.hasMore)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(undefined)
    }
  }

  async function pick(p: StockPhoto) {
    setBusy(p.id)
    setError(undefined)
    try {
      await onPick(await downloadPhoto(p.image, pc.passcode), { name: p.photographer || 'Unknown', url: p.page })
    } catch (e) {
      setError(errorMessage(e))
      setBusy(undefined)
    }
  }

  return (
    <div className="fill panel stack stack--tight" role="group" aria-label="Find a photo">
      <div className="stack stack--tight">
        <div className="field">
          <label htmlFor="photo-q">Search stock photos</label>
          <input
            id="photo-q"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            onKeyDown={(e) => {
              // This panel lives inside the recipe form, so Enter must search here and never submit the recipe.
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (canSearch) void search()
            }}
          />
        </div>
        <PasscodeField value={pc.passcode} onChange={pc.setPasscode} editing={pc.editing} onEdit={() => pc.setEditing(true)} />
        <div className="row">
          <button type="button" className="btn" onClick={() => void search()} disabled={!canSearch}>
            <MagnifyingGlass aria-hidden="true" />
            {busy === 'search' ? 'Searching…' : 'Search'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {results && results.length === 0 && <p className="muted small">No photos found. Try different words.</p>}
      {results && results.length > 0 && usedQuery.toLowerCase() !== searched.toLowerCase() && (
        <p className="muted small" role="status">
          Nothing matched “{searched}” exactly, so these are results for “{usedQuery}”.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="stock" aria-label="Photo results">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="stock__btn"
                disabled={busy !== undefined}
                onClick={() => void pick(p)}
                aria-label={`Use photo by ${p.photographer || 'unknown'}${p.alt ? `: ${p.alt}` : ''}`}
              >
                <img src={p.thumb} alt="" loading="lazy" />
                {busy === p.id && <span className="stock__busy">Saving…</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {results && results.length > 0 && hasMore && (
        <div className="row">
          <button type="button" className="btn" onClick={() => void more()} disabled={busy !== undefined}>
            {busy === 'more' ? 'Loading…' : 'More photos'}
          </button>
        </div>
      )}
      <p className="muted small">
        Photos provided by{' '}
        <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer">
          Pixabay
        </a>
        . They are real stock photos, not pictures of your dish.
      </p>
    </div>
  )
}
