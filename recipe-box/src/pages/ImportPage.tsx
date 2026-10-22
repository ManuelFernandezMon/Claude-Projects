import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RecipePrefill } from '../types'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ImportError, extractRecipe, fetchTikTokCaption, loadPasscode, savePasscode } from '../lib/importApi'
import { newId } from '../lib/id'
import { safeHttpUrl, sourceKind } from '../lib/url'

const MAX_TEXT = 8000

export function ImportPage() {
  useDocumentTitle('Import from link')
  const navigate = useNavigate()
  const { categories } = useData()
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [passcode, setPasscode] = useState(loadPasscode)
  const [editPasscode, setEditPasscode] = useState(() => loadPasscode() === '')
  const [busy, setBusy] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [hint, setHint] = useState<string>()
  const [error, setError] = useState<string>()

  const cleanUrl = safeHttpUrl(url)
  const kind = cleanUrl ? sourceKind(cleanUrl) : 'other'
  const tooShort = text.trim().length < 20
  const tooLong = text.length > MAX_TEXT

  async function onUrlChange(value: string) {
    setUrl(value)
    setHint(undefined)
    const clean = safeHttpUrl(value)
    if (!clean) return
    if (sourceKind(clean) === 'instagram') {
      setHint('Instagram does not allow automatic reading. Open the post, copy its caption, and paste it below.')
    } else if (sourceKind(clean) === 'tiktok' && text.trim() === '') {
      setFetching(true)
      const caption = await fetchTikTokCaption(clean)
      setFetching(false)
      if (caption) {
        setText(caption)
        setHint('Caption fetched from TikTok. Check it, and add anything that is missing.')
      } else {
        setHint('Could not fetch the caption automatically. Copy it from the video and paste it below.')
      }
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (tooShort || tooLong || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const r = await extractRecipe(
        { url: cleanUrl, text: text.trim(), categories: categories.map((c) => c.name) },
        passcode,
      )
      if (!r) {
        setError('No recipe found in that text. Make sure the caption lists ingredients or steps.')
        return
      }
      savePasscode(passcode)
      const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
      const prefill: RecipePrefill = {
        title: r.title,
        description: r.description,
        prep: r.prepMinutes?.toString() ?? '',
        cook: r.cookMinutes?.toString() ?? '',
        servings: r.servings?.toString() ?? '',
        categoryIds: r.categoryNames.flatMap((n) => byName.get(n.toLowerCase()) ?? []),
        ingredients: r.ingredients.map((i) => ({ id: newId(), name: i.name, quantity: i.quantity || undefined })),
        steps: r.steps,
        sourceUrl: cleanUrl ?? '',
      }
      navigate('/recipes/new', { state: { prefill } })
    } catch (err) {
      if (err instanceof ImportError && err.code === 'unauthorized') {
        setEditPasscode(true)
        setPasscode('')
        savePasscode('')
      }
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Link to="/" className="back">
        ← Recipes
      </Link>
      <h1 className="h1">Import from link</h1>
      <p className="muted">
        Paste a TikTok or Instagram link and the video’s caption. Claude turns the text into a recipe with an
        ingredient checklist, and you review it before saving. Recipes that are only spoken in the video, with no
        ingredients in the caption, can’t be read.
      </p>

      <div className="field">
        <label htmlFor="imp-url">Link</label>
        <input
          id="imp-url"
          className="input"
          type="url"
          inputMode="url"
          placeholder="https://www.tiktok.com/@user/video/…"
          value={url}
          onChange={(e) => void onUrlChange(e.target.value)}
          aria-invalid={url.trim() !== '' && !cleanUrl ? true : undefined}
        />
        {url.trim() !== '' && !cleanUrl && <span className="error">Enter a full link starting with https://</span>}
        {kind === 'other' && cleanUrl && (
          <span className="muted small">Only the caption text below is used; the link is saved as the source.</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="imp-text">Caption text</label>
        <textarea
          id="imp-text"
          className="input"
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the caption with the ingredients and steps…"
          aria-describedby="imp-count"
        />
        <span id="imp-count" className={`small ${tooLong ? 'error' : 'muted'}`}>
          {text.length}/{MAX_TEXT}
        </span>
      </div>

      {fetching && (
        <p className="muted" role="status">
          Fetching caption from TikTok…
        </p>
      )}
      {hint && (
        <p className="notice" role="status">
          {hint}
        </p>
      )}

      {editPasscode ? (
        <div className="field">
          <label htmlFor="imp-pass">Import passcode</label>
          <input
            id="imp-pass"
            className="input"
            type="password"
            autoComplete="off"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <span className="muted small">
            Set as <code>RECIPE_IMPORT_PASSCODE</code> on the server. It is stored only on this device.
          </span>
        </div>
      ) : (
        <p className="muted small">
          Passcode saved on this device.{' '}
          <button type="button" className="link-btn" onClick={() => setEditPasscode(true)}>
            Change
          </button>
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={busy || tooShort || tooLong || !passcode}>
          {busy ? 'Reading the caption…' : 'Extract recipe'}
        </button>
        {busy && (
          <span className="muted" role="status">
            This can take up to 30 seconds.
          </span>
        )}
      </div>
    </form>
  )
}
