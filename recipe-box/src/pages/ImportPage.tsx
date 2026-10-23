import { useRef, useState, type FormEvent } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import { Link, useNavigate } from 'react-router-dom'
import { PasscodeField } from '../components/PasscodeField'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePasscode } from '../hooks/usePasscode'
import { ImportError, extractRecipe, fetchTikTokCaption } from '../lib/importApi'
import { toPrefill } from '../lib/prefill'
import { safeHttpUrl, sourceKind } from '../lib/url'
import {
  MAX_VIDEO_MB,
  MAX_VIDEO_MINUTES,
  RETRYABLE_CODES,
  discardVideo,
  extractVideo,
  loadVideo,
  uploadVideo,
  type UploadedVideo,
} from '../lib/videoApi'

const MAX_TEXT = 8000

type VideoPhase = { kind: 'idle' } | { kind: 'preparing' } | { kind: 'uploading'; fraction: number } | { kind: 'reading' }

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
  const [picked, setPicked] = useState<{ name: string; mb: string }>()
  const [fetching, setFetching] = useState(false)
  const [hint, setHint] = useState<string>()
  const [error, setError] = useState<string>()
  const [errorDetail, setErrorDetail] = useState<string>()
  const [errorCode, setErrorCode] = useState<string>()
  /** A video already on Google whose analysis failed for a transient reason: it can be retried without uploading again. */
  const [pending, setPending] = useState<UploadedVideo>()
  const filesRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<HTMLInputElement>(null)

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
    setErrorDetail(err instanceof ImportError ? err.detail : undefined)
    setErrorCode(err instanceof ImportError ? err.code : undefined)
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

  async function analyse(uploaded: UploadedVideo) {
    setVideo({ kind: 'reading' })
    try {
      const r = await extractVideo({ file: uploaded, url: cleanUrl, categories: categories.map((c) => c.name) }, passcode)
      setPending(undefined)
      if (!r) {
        setError('No recipe found in that video. Make sure it shows or explains the ingredients and steps.')
        return
      }
      openEditor(r)
    } catch (err) {
      // Overloaded model or quota: the video is still on Google, so offer to retry without uploading it again.
      setPending(err instanceof ImportError && RETRYABLE_CODES.has(err.code) ? uploaded : undefined)
      fail(err)
    } finally {
      setVideo({ kind: 'idle' })
    }
  }

  async function onVideoPicked(file: File | undefined) {
    if (!file || working) return
    setPicked({ name: file.name, mb: (file.size / 1024 / 1024).toFixed(1) })
    if (!passcode) {
      setError('Enter the passcode above first, then choose the video again.')
      pc.setEditing(true)
      setTimeout(() => document.getElementById('ai-pass')?.focus(), 0)
      return
    }
    if (pending) void discardVideo(pending, passcode) // a new choice replaces the kept upload
    setPending(undefined)
    setError(undefined)
    setErrorDetail(undefined)
    setErrorCode(undefined)
    setVideo({ kind: 'preparing' })
    let uploaded: UploadedVideo
    try {
      // Read the whole file first thing: Android's photo picker permission can lapse seconds after picking.
      const loaded = await loadVideo(file)
      setVideo({ kind: 'uploading', fraction: 0 })
      uploaded = await uploadVideo(loaded, passcode, (fraction) => setVideo({ kind: 'uploading', fraction }))
    } catch (err) {
      fail(err)
      setVideo({ kind: 'idle' })
      return
    } finally {
      for (const ref of [filesRef, photosRef]) if (ref.current) ref.current.value = '' // only now: clearing earlier can invalidate the file on some phones
    }
    await analyse(uploaded)
  }

  async function retryAnalysis() {
    if (!pending || working) return
    setError(undefined)
    setErrorDetail(undefined)
    setErrorCode(undefined)
    await analyse(pending)
  }

  async function discardPending() {
    if (!pending) return
    await discardVideo(pending, passcode)
    setPending(undefined)
    setError(undefined)
    setErrorDetail(undefined)
    setPicked(undefined)
  }

  return (
    <div className="stack">
      <Link to="/" className="back">
        <CaretLeft aria-hidden="true" weight="bold" />
        Recipes
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
          {/* Real <label>s around the inputs work in every mobile browser; no script-triggered click needed.
              The first input also accepts application/octet-stream: Chrome on Android only opens the system photo picker
              when EVERY accepted type is an image or video, and that picker's temporary file permission can fail with
              NotReadableError. Adding a non-media type makes Chrome open the normal file chooser instead. */}
          <div className="row">
            <label className={`btn btn--primary${working ? ' btn--disabled' : ''}`}>
              Choose video
              <input
                ref={filesRef}
                type="file"
                accept="video/*,application/octet-stream"
                className="sr-only"
                data-testid="video-file-input"
                disabled={working}
                onChange={(e) => void onVideoPicked(e.target.files?.[0])}
              />
            </label>
            <label className={`btn${working ? ' btn--disabled' : ''}`}>
              From Photos
              <input
                ref={photosRef}
                type="file"
                accept="video/*"
                className="sr-only"
                data-testid="video-photos-input"
                disabled={working}
                onChange={(e) => void onVideoPicked(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
        {!passcode && <p className="muted small">Enter the passcode above before choosing a video.</p>}
        {picked && (
          <p className="small" role="status">
            Selected: <strong>{picked.name}</strong> ({picked.mb} MB)
          </p>
        )}
        {video.kind === 'preparing' && (
          <p className="muted" role="status">
            Preparing the video…
          </p>
        )}
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
          Needs a Gemini key on the server. The video is sent to Google and deleted right after it is read. If the
          analysis fails (for example because Gemini is busy) it stays on Google so you can retry, until you discard it
          or Google removes it after 48 hours. On Gemini’s free tier Google may use submitted content to improve its
          products. Don’t upload videos you don’t want to share.
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

      {pending && !working && (
        <div className="panel stack stack--tight">
          <p>
            <strong>Your video is already uploaded.</strong> You do not need to upload it again.
          </p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={() => void retryAnalysis()}>
              Try again
            </button>
            <button type="button" className="btn btn--danger-ghost" onClick={() => void discardPending()}>
              Discard upload
            </button>
          </div>
          <p className="muted small">It stays on Google until you discard it (Google deletes uploads after 48 hours).</p>
        </div>
      )}

      {error && (
        <div role="alert">
          <p className="error">{error}</p>
          {errorCode === 'file_unreadable' && (
            <p className="muted small">
              This is a phone permission problem, not your connection. “Choose video” opens your Files app; “From
              Photos” opens the photo picker. If both fail, save the video to Downloads first.
            </p>
          )}
          {errorDetail && <p className="muted small">Details: {errorDetail}</p>}
        </div>
      )}
    </div>
  )
}
