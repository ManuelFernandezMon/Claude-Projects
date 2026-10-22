import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PasscodeField } from '../components/PasscodeField'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePasscode } from '../hooks/usePasscode'
import { ImportError, extractRecipe, fetchTikTokCaption } from '../lib/importApi'
import { toPrefill } from '../lib/prefill'
import { safeHttpUrl, sourceKind } from '../lib/url'
import { MAX_VIDEO_MB, MAX_VIDEO_MINUTES, extractVideo, uploadVideo } from '../lib/videoApi'

const MAX_TEXT = 8000

type VideoPhase = { kind: 'idle' } | { kind: 'uploading'; fraction: number } | { kind: 'reading' }

export function ImportPage() {
  useDocumentTitle('Import a recipe')
  const navigate = useNavigate()
  const { categories } = useData()
  const pc = usePasscode()
  const passcode = pc.passcode
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [video, setVideo] = useState<VideoPhase>({ kind: 'idle' })
  const [fetching, setFetching] = useState(false)
  const [hint, setHint] = useState<string>()
  const [error, setError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)

  const cleanUrl = safeHttpUrl(url)
  const kind = cleanUrl ? sourceKind(cleanUrl) : 'other'
  const tooShort = text.trim().length < 20
  const tooLong = text.length > MAX_TEXT
  const working = busy || video.kind !== 'idle'

  async function onUrlChange(value: string) {
    setUrl(value)
    setHint(undefined)
    const clean = safeHttpUrl(value)
    if (!clean) return
    if (sourceKind(clean) === 'instagram') {
      setHint('Instagram does not allow automatic reading of the post. Upload the video below, or paste its caption.')
    } else if (sourceKind(clean) === 'tiktok' && text.trim() === '') {
      setFetching(true)
      const caption = await fetchTikTokCaption(clean)
      setFetching(false)
      if (caption) {
        setText(caption)
        setHint('Caption fetched from TikTok. Check it, and add anything that is missing.')
      } else {
        setHint('Could not fetch the caption automatically. Upload the video below, or paste the caption.')
      }
    }
  }

  function openEditor(r: Parameters<typeof toPrefill>[0]) {
    pc.remember()
    navigate('/recipes/new', { state: { prefill: toPrefill(r, categories, { sourceUrl: cleanUrl }) } })
  }

  function fail(err: unknown) {
    if (err instanceof ImportError && err.code === 'unauthorized') pc.forget()
    setError(err instanceof Error ? err.message : String(err))
  }

  async function submitCaption(e: FormEvent) {
    e.preventDefault()
    if (tooShort || tooLong || working) return
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
      openEditor(r)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  async function onVideoPicked(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file || working) return
    if (!passcode) {
      setError('Enter the passcode first.')
      return
    }
    setError(undefined)
    setVideo({ kind: 'uploading', fraction: 0 })
    try {
      const uploaded = await uploadVideo(file, passcode, (fraction) => setVideo({ kind: 'uploading', fraction }))
      setVideo({ kind: 'reading' })
      const r = await extractVideo({ file: uploaded, url: cleanUrl, categories: categories.map((c) => c.name) }, passcode)
      if (!r) {
        setError('No recipe found in that video. Make sure it shows or explains the ingredients and steps.')
        return
      }
      openEditor(r)
    } catch (err) {
      fail(err)
    } finally {
      setVideo({ kind: 'idle' })
    }
  }

  return (
    <div className="stack">
      <Link to="/" className="back">
        ← Recipes
      </Link>
      <h1 className="h1">Import a recipe</h1>
      <p className="muted">
        The AI turns a video or a caption into a recipe with an ingredient checklist, and you review it before saving.
      </p>

      <div className="field">
        <label htmlFor="imp-url">Link (optional, saved as the source)</label>
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
          <span className="muted small">The link is only saved as the source. The AI reads the video or caption you give it.</span>
        )}
      </div>

      {hint && (
        <p className="notice" role="status">
          {hint}
        </p>
      )}
      {fetching && (
        <p className="muted" role="status">
          Fetching caption from TikTok…
        </p>
      )}

      <PasscodeField value={pc.passcode} onChange={pc.setPasscode} editing={pc.editing} onEdit={() => pc.setEditing(true)} />

      <section className="panel stack stack--tight" aria-labelledby="vid-h">
        <h2 id="vid-h" className="h2">
          Option 1: upload the video (no caption needed)
        </h2>
        <p className="muted">
          The AI watches the video and listens to it, so it can pick up ingredients that are only said out loud. TikTok
          and Instagram do not let apps download videos from a link, so save it first: on TikTok use Share → Save video;
          on Instagram or anywhere else, screen-record it with sound. Up to {MAX_VIDEO_MB} MB and {MAX_VIDEO_MINUTES}{' '}
          minutes.
        </p>
        <div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => fileRef.current?.click()}
            disabled={working || !passcode}
          >
            Choose video
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            hidden
            data-testid="video-file-input"
            onChange={(e) => void onVideoPicked(e.target.files?.[0])}
          />
        </div>
        {video.kind === 'uploading' && (
          <div role="status">
            <label htmlFor="vid-progress" className="small muted">
              Uploading… {Math.round(video.fraction * 100)}%
            </label>
            <progress id="vid-progress" className="progress" max={1} value={video.fraction} />
          </div>
        )}
        {video.kind === 'reading' && (
          <p className="muted" role="status">
            Watching the video… this can take up to a minute.
          </p>
        )}
        <p className="muted small">
          Needs a Gemini key on the server. The video is sent to Google, deleted right after it is read, and on
          Gemini’s free tier Google may use submitted content to improve its products. Don’t upload videos you don’t
          want to share.
        </p>
      </section>

      <form className="panel stack stack--tight" onSubmit={submitCaption} noValidate aria-labelledby="cap-h">
        <h2 id="cap-h" className="h2">
          Option 2: paste the caption
        </h2>
        <div className="field">
          <label htmlFor="imp-text">Caption text</label>
          <textarea
            id="imp-text"
            className="input"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the caption with the ingredients and steps…"
            aria-describedby="imp-count"
          />
          <span id="imp-count" className={`small ${tooLong ? 'error' : 'muted'}`}>
            {text.length}/{MAX_TEXT}
          </span>
        </div>
        <div className="row">
          <button type="submit" className="btn" disabled={working || tooShort || tooLong || !passcode}>
            {busy ? 'Reading the caption…' : 'Extract recipe'}
          </button>
          {busy && (
            <span className="muted" role="status">
              This can take up to 30 seconds.
            </span>
          )}
        </div>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
