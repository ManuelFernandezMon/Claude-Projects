import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CaretLeft, FileVideo, X } from '@phosphor-icons/react'
import { Link, useNavigate } from '../lib/nav'
import { PasscodeField } from '../components/PasscodeField'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePasscode } from '../hooks/usePasscode'
import { newId } from '../lib/id'
import { ImportError, extractRecipe, fetchTikTokCaption } from '../lib/importApi'
import { toPrefill } from '../lib/prefill'
import { makeLite } from '../lib/liteVideo'
import { MAX_SCREENSHOTS, blobToBase64, encodeScreenshots, prepareScreenshot, type Screenshot } from '../lib/screenshots'
import { safeHttpUrl, sourceKind } from '../lib/url'
import {
  MAX_TOTAL_VIDEO_MB,
  MAX_VIDEOS,
  MAX_VIDEO_MB,
  MAX_VIDEO_MINUTES,
  RETRYABLE_CODES,
  discardVideos,
  extractSources,
  loadVideo,
  uploadVideo,
  type LoadedVideo,
  type UploadedVideo,
} from '../lib/videoApi'

const MAX_TEXT = 8000

const FAST_KEY = 'recipe-box:fast-import'
const loadFast = (): boolean => {
  try {
    return localStorage.getItem(FAST_KEY) !== 'off'
  } catch {
    return true
  }
}
/** Picture budget of one request (base64 characters), shared by screenshots and video frames. */
const PICTURE_BUDGET = 3_600_000

interface SentFrame {
  t: number
  video: number
  mimeType: string
  data: string
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'preparing'; label?: string }
  | { kind: 'uploading'; index: number; count: number; fraction: number; note?: string }
  | { kind: 'reading' }

type Source =
  | { id: string; kind: 'video'; name: string; mb: string; loaded: LoadedVideo }
  | { id: string; kind: 'image'; name: string; mb: string; shot: Screenshot; thumb: string }

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)

export function ImportPage() {
  useDocumentTitle('Import a recipe')
  const navigate = useNavigate()
  const { categories } = useData()
  const pc = usePasscode()
  const passcode = pc.passcode
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [sources, setSources] = useState<Source[]>([])
  const [adding, setAdding] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [hint, setHint] = useState<string>()
  const [error, setError] = useState<string>()
  const [errorDetail, setErrorDetail] = useState<string>()
  const [errorCode, setErrorCode] = useState<string>()
  /** Videos already on Google, by source id. After a transient failure they are reused instead of uploaded again. */
  const [uploaded, setUploaded] = useState<Record<string, UploadedVideo>>({})
  /** Fast mode: send each video's sound and still frames instead of the whole video. Falls back to the video if the phone cannot. */
  const [fast, setFast] = useState(loadFast)
  /** The frames already taken for a video whose sound is held on Google, so a retry does not redo them. */
  const framesRef = useRef<Record<string, SentFrame[]>>({})
  const videoFilesRef = useRef<HTMLInputElement>(null)
  const videoPhotosRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<HTMLInputElement>(null)
  const thumbs = useRef<string[]>([])

  useEffect(() => () => thumbs.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const cleanUrl = safeHttpUrl(url)
  const kind = cleanUrl ? sourceKind(cleanUrl) : 'other'
  const videos = sources.filter((x): x is Extract<Source, { kind: 'video' }> => x.kind === 'video')
  const images = sources.filter((x): x is Extract<Source, { kind: 'image' }> => x.kind === 'image')
  const tooLong = text.length > MAX_TEXT
  const hasFiles = sources.length > 0
  const working = busy || adding || phase.kind !== 'idle'
  const canRead = !working && !tooLong && !!passcode && (hasFiles || text.trim().length >= 20)
  const heldVideo = Object.keys(uploaded).length > 0

  async function onUrlChange(value: string) {
    setUrl(value)
    setHint(undefined)
    const clean = safeHttpUrl(value)
    if (!clean) return
    if (sourceKind(clean) === 'instagram') {
      setHint('Instagram does not allow automatic reading of the post. Add the video or a screenshot of the caption below, or paste the caption.')
    } else if (sourceKind(clean) === 'tiktok' && text.trim() === '') {
      setFetching(true)
      const caption = await fetchTikTokCaption(clean)
      setFetching(false)
      if (caption) {
        setText(caption)
        setHint('Caption fetched from TikTok. Check it, and add anything that is missing.')
      } else {
        setHint('Could not fetch the caption automatically. Add the video or a screenshot of the caption below, or paste the caption.')
      }
    }
  }

  function openEditor(r: Parameters<typeof toPrefill>[0]) {
    pc.remember()
    navigate('/recipes/new', { state: { prefill: toPrefill(r, categories, { sourceUrl: cleanUrl }) } })
  }

  function clearError() {
    setError(undefined)
    setErrorDetail(undefined)
    setErrorCode(undefined)
  }

  function fail(err: unknown) {
    if (err instanceof ImportError && err.code === 'unauthorized') pc.forget()
    setError(err instanceof Error ? err.message : String(err))
    setErrorDetail(err instanceof ImportError ? err.detail : undefined)
    setErrorCode(err instanceof ImportError ? err.code : undefined)
  }

  /**
   * Reads every chosen file into memory right away: Android's photo picker hands the browser a temporary permission that
   * can lapse a few seconds later, so nothing touches the original file after this.
   */
  async function addFiles(type: 'video' | 'image', picked: File[]) {
    if (!picked.length) return
    clearError()
    setAdding(true)
    const problems: string[] = []
    const added: Source[] = []
    try {
      let videoMb = videos.reduce((n, v) => n + v.loaded.bytes.byteLength / 1024 / 1024, 0)
      let videoCount = videos.length
      let imageCount = images.length
      for (const file of picked) {
        try {
          if (type === 'video') {
            if (videoCount >= MAX_VIDEOS) {
              problems.push(`At most ${MAX_VIDEOS} videos at a time.`)
              break
            }
            const loaded = await loadVideo(file)
            const size = loaded.bytes.byteLength / 1024 / 1024
            if (videoMb + size > MAX_TOTAL_VIDEO_MB) {
              problems.push(`The videos together can be at most ${MAX_TOTAL_VIDEO_MB} MB.`)
              break
            }
            videoMb += size
            videoCount++
            added.push({ id: newId(), kind: 'video', name: file.name, mb: mb(loaded.bytes.byteLength), loaded })
          } else {
            if (imageCount >= MAX_SCREENSHOTS) {
              problems.push(`At most ${MAX_SCREENSHOTS} screenshots at a time.`)
              break
            }
            const id = newId()
            const shot = await prepareScreenshot(file, id)
            const thumb = URL.createObjectURL(shot.blob)
            thumbs.current.push(thumb)
            imageCount++
            added.push({ id, kind: 'image', name: shot.name, mb: mb(shot.blob.size), shot, thumb })
          }
        } catch (err) {
          if (err instanceof ImportError) {
            problems.push(err.message)
            if (err.detail) setErrorDetail(err.detail)
            setErrorCode(err.code)
          } else {
            problems.push(err instanceof Error ? err.message : String(err))
          }
        }
      }
    } finally {
      for (const ref of [videoFilesRef, videoPhotosRef, imagesRef]) if (ref.current) ref.current.value = '' // only now: clearing earlier can invalidate the file on some phones
      setAdding(false)
    }
    if (added.length) setSources((prev) => [...prev, ...added])
    if (problems.length) setError([...new Set(problems)].join(' '))
  }

  function removeSource(id: string) {
    const gone = sources.find((x) => x.id === id)
    if (gone?.kind === 'image') URL.revokeObjectURL(gone.thumb)
    const up = uploaded[id]
    if (up) {
      void discardVideos([up], passcode) // it is already on Google: remove it there too
      setUploaded(({ [id]: _drop, ...rest }) => rest)
    }
    delete framesRef.current[id]
    setSources((prev) => prev.filter((x) => x.id !== id))
    clearError()
  }

  async function analyse(refs: UploadedVideo[], encoded: { mimeType: string; data: string }[], frames: SentFrame[]) {
    setPhase({ kind: 'reading' })
    try {
      const { recipe: r, reason } = await extractSources(
        { files: refs, images: encoded, ...(frames.length ? { frames } : {}), text: text.trim() || undefined, url: cleanUrl, categories: categories.map((c) => c.name) },
        passcode,
      )
      setUploaded({}) // the server deletes the videos once they have been read
      framesRef.current = {}
      if (!r) {
        setError(
          `No recipe found. ${reason ? `Gemini saw: “${reason}” ` : ''}Make sure the video, screenshots or text show or explain the ingredients and steps (with sound, if the recipe is spoken).`,
        )
        return
      }
      openEditor(r)
    } catch (err) {
      // Overloaded model or quota: the videos are still on Google, so they are kept for a retry without uploading again.
      if (!(err instanceof ImportError && RETRYABLE_CODES.has(err.code))) {
        setUploaded({})
        framesRef.current = {}
      }
      fail(err)
    } finally {
      setPhase({ kind: 'idle' })
    }
  }

  async function readEverything(e?: FormEvent) {
    e?.preventDefault()
    if (!canRead) return
    clearError()

    // Only text: the original caption path (works with either AI provider).
    if (!hasFiles) {
      setBusy(true)
      try {
        const r = await extractRecipe({ url: cleanUrl, text: text.trim(), categories: categories.map((c) => c.name) }, passcode)
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
      return
    }

    setPhase({ kind: 'preparing', label: images.length ? 'Preparing the screenshots…' : undefined })
    let encoded: { mimeType: string; data: string }[]
    try {
      encoded = images.length ? await encodeScreenshots(images.map((i) => i.shot)) : []
    } catch (err) {
      fail(err)
      setPhase({ kind: 'idle' })
      return
    }
    const shotChars = encoded.reduce((n, i) => n + i.data.length, 0)
    const refs: UploadedVideo[] = []
    const frames: SentFrame[] = []
    const held = { ...uploaded }
    try {
      for (const [i, v] of videos.entries()) {
        const label = videos.length > 1 ? ` ${i + 1} of ${videos.length}` : ''
        const have = held[v.id]
        if (have) {
          refs.push(have)
          frames.push(...(framesRef.current[v.id] ?? []))
          continue
        }
        let note: string | undefined
        let toUpload: LoadedVideo = v.loaded
        if (fast) {
          setPhase({ kind: 'preparing', label: `Preparing video${label}: taking pictures and the sound…` })
          try {
            const lite = await makeLite(v.loaded.bytes, v.loaded.mimeType, Math.floor((PICTURE_BUDGET - shotChars) / videos.length))
            const taken: SentFrame[] = await Promise.all(
              lite.frames.map(async (f) => ({ t: f.t, video: i + 1, mimeType: 'image/jpeg', data: await blobToBase64(f.blob) })),
            )
            framesRef.current[v.id] = taken
            frames.push(...taken)
            if (!lite.audio) continue // a video with no sound: the pictures are all there is to send
            toUpload = { name: 'audio.wav', mimeType: 'audio/wav', bytes: await lite.audio.arrayBuffer(), durationSec: lite.durationSec }
            note = `Sending the sound and ${taken.length} pictures (${mb(toUpload.bytes.byteLength)} MB) instead of the whole video (${v.mb} MB)`
          } catch {
            // this phone could not take the pictures or the sound (LiteUnavailable, or anything unexpected): send the whole video as before
            delete framesRef.current[v.id]
            frames.splice(0, frames.length, ...frames.filter((f) => f.video !== i + 1))
            toUpload = v.loaded
          }
        }
        setPhase({ kind: 'uploading', index: i + 1, count: videos.length, fraction: 0, note })
        const up = await uploadVideo(toUpload, passcode, (fraction) => setPhase({ kind: 'uploading', index: i + 1, count: videos.length, fraction, note }))
        held[v.id] = up
        setUploaded({ ...held })
        refs.push(up)
      }
    } catch (err) {
      fail(err)
      setPhase({ kind: 'idle' })
      return
    }
    await analyse(refs, encoded, frames)
  }

  async function discardHeld() {
    await discardVideos(Object.values(uploaded), passcode)
    setUploaded({})
    clearError()
  }

  const inputProps = (type: 'video' | 'image', ref: React.RefObject<HTMLInputElement | null>, accept: string, testId: string) => ({
    ref,
    type: 'file' as const,
    accept,
    multiple: true,
    className: 'sr-only',
    'data-testid': testId,
    disabled: working,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void addFiles(type, Array.from(e.target.files ?? [])),
  })

  return (
    <div className="stack">
      <Link to="/" className="back">
        <CaretLeft aria-hidden="true" weight="bold" />
        Recipes
      </Link>
      <h1 className="h1">Import a recipe</h1>
      <p className="muted">
        The AI turns a video, screenshots or a caption (or any mix of them) into a recipe with an ingredient checklist, and you
        review it before saving.
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
          <span className="muted small">The link is only saved as the source. The AI reads what you add below.</span>
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

      <form className="panel stack stack--tight" onSubmit={readEverything} noValidate aria-labelledby="src-h">
        <h2 id="src-h" className="h2">
          What do you have?
        </h2>
        <p className="muted">
          Add a video, screenshots (for example of the caption or an ingredient list), pasted text, or all of them. The AI reads
          everything together as one recipe. TikTok and Instagram do not let apps download videos from a link, so save the video
          first: on TikTok use Share → Save video; on Instagram or anywhere else, screen-record it with sound. Up to{' '}
          {MAX_VIDEOS} videos ({MAX_VIDEO_MB} MB and {MAX_VIDEO_MINUTES} minutes each) and {MAX_SCREENSHOTS} screenshots.
        </p>
        {/* Real <label>s around the inputs work in every mobile browser; no script-triggered click needed.
            The first video input also accepts application/octet-stream: Chrome on Android only opens the system photo picker
            when EVERY accepted type is an image or video, and that picker's temporary file permission can fail with
            NotReadableError. Adding a non-media type makes Chrome open the normal file chooser instead. */}
        <div className="row">
          <label className={`btn btn--primary${working ? ' btn--disabled' : ''}`}>
            Add video
            <input {...inputProps('video', videoFilesRef, 'video/*,application/octet-stream', 'video-file-input')} />
          </label>
          <label className={`btn${working ? ' btn--disabled' : ''}`}>
            Video from Photos
            <input {...inputProps('video', videoPhotosRef, 'video/*', 'video-photos-input')} />
          </label>
          <label className={`btn${working ? ' btn--disabled' : ''}`}>
            Add screenshots
            <input {...inputProps('image', imagesRef, 'image/*', 'source-images-input')} />
          </label>
        </div>

        <label className="fast">
          <input
            type="checkbox"
            checked={fast}
            disabled={working}
            data-testid="fast-mode"
            onChange={(e) => {
              setFast(e.target.checked)
              try {
                localStorage.setItem(FAST_KEY, e.target.checked ? 'on' : 'off')
              } catch {
                /* the choice lasts until the app is closed */
              }
            }}
          />
          <span>
            <strong>Fast mode</strong>
            <span className="muted small">
              Sends each video&rsquo;s sound and pictures from it instead of the whole video: a much smaller upload and a faster
              reading. If your phone cannot do it, the whole video is sent.
            </span>
          </span>
        </label>

        {adding && (
          <p className="muted" role="status">
            Preparing your files…
          </p>
        )}

        {sources.length > 0 && (
          <ul className="sources" aria-label="Files the AI will read">
            {sources.map((x) => (
              <li key={x.id} className="sources__item">
                {x.kind === 'image' ? (
                  <img className="sources__thumb" src={x.thumb} alt="" />
                ) : (
                  <span className="sources__thumb sources__thumb--video" aria-hidden="true">
                    <FileVideo weight="duotone" />
                  </span>
                )}
                <span className="sources__name">
                  <strong>{x.name}</strong>
                  <span className="muted small">
                    {x.kind === 'video' ? 'Video' : 'Screenshot'} · {x.mb} MB{uploaded[x.id] ? ' · uploaded' : ''}
                  </span>
                </span>
                <button type="button" className="btn btn--icon btn--ghost" onClick={() => removeSource(x.id)} disabled={working} aria-label={`Remove ${x.name}`}>
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="field">
          <label htmlFor="imp-text">Caption or text (optional when you added files)</label>
          <textarea
            id="imp-text"
            className="input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the caption with the ingredients and steps…"
            aria-describedby="imp-count"
          />
          <span id="imp-count" className={`small ${tooLong ? 'error' : 'muted'}`}>
            {text.length}/{MAX_TEXT}
          </span>
        </div>

        {phase.kind === 'preparing' && (
          <p className="muted" role="status">
            {phase.label ?? 'Preparing…'}
          </p>
        )}
        {phase.kind === 'uploading' && (
          <div role="status">
            <label htmlFor="vid-progress" className="small muted">
              {phase.count > 1 ? `Uploading video ${phase.index} of ${phase.count}… ` : 'Uploading… '}
              {Math.round(phase.fraction * 100)}%
            </label>
            <progress id="vid-progress" className="progress" max={1} value={phase.fraction} />
            {phase.note && <p className="muted small">{phase.note}</p>}
          </div>
        )}
        {phase.kind === 'reading' && (
          <p className="muted" role="status">
            {videos.length ? 'Watching and reading everything… this can take up to a minute.' : 'Reading…'}
          </p>
        )}

        <div className="row">
          <button type="submit" className="btn btn--primary" disabled={!canRead}>
            {busy ? 'Reading the caption…' : phase.kind !== 'idle' ? 'Working…' : 'Extract recipe'}
          </button>
          {!passcode && <span className="muted small">Enter the passcode above first.</span>}
          {passcode && !hasFiles && text.trim().length < 20 && (
            <span className="muted small">Add a video, a screenshot, or at least a short caption.</span>
          )}
          {busy && (
            <span className="muted" role="status">
              This can take up to 30 seconds.
            </span>
          )}
        </div>

        <p className="muted small">
          Videos and screenshots need a Gemini key on the server. They are sent to Google and the videos are deleted right after they
          are read. If the analysis fails (for example because Gemini is busy) the videos stay on Google so you can retry, until you
          discard them or Google removes them after 48 hours. On Gemini’s free tier Google may use submitted content to improve its
          products. Don’t add anything you don’t want to share.
        </p>
      </form>

      {heldVideo && !working && (
        <div className="panel stack stack--tight">
          <p>
            <strong>{Object.keys(uploaded).length > 1 ? 'Your videos are already uploaded.' : 'Your video is already uploaded.'}</strong>{' '}
            You do not need to upload {Object.keys(uploaded).length > 1 ? 'them' : 'it'} again.
          </p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={() => void readEverything()} disabled={!canRead}>
              Try again
            </button>
            <button type="button" className="btn btn--danger-ghost" onClick={() => void discardHeld()}>
              Discard upload
            </button>
          </div>
          <p className="muted small">They stay on Google until you discard them (Google deletes uploads after 48 hours).</p>
        </div>
      )}

      {error && (
        <div role="alert">
          <p className="error">{error}</p>
          {errorCode === 'file_unreadable' && (
            <p className="muted small">
              This is a phone permission problem, not your connection. “Add video” opens your Files app; “Video from Photos” opens
              the photo picker. If both fail, save the video to Downloads first.
            </p>
          )}
          {errorDetail && <p className="muted small">Details: {errorDetail}</p>}
        </div>
      )}
    </div>
  )
}
