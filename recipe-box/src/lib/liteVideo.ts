import { compressImage } from './image'

/**
 * A "light" copy of a video for the AI: its sound (a small WAV file) and still pictures taken from it at regular moments.
 * It is a fraction of the video's size, so it uploads and is read much faster, and everything that is said or written on
 * screen is still there. Anything that goes wrong throws LiteUnavailable and the caller sends the whole video instead.
 */
export class LiteUnavailable extends Error {}

export interface Frame {
  /** Seconds from the start of the video. */
  t: number
  /** JPEG. */
  blob: Blob
}

export interface LiteVideo {
  durationSec: number
  frames: Frame[]
  /** 16 kHz mono 16-bit WAV, or undefined when the video has no audible sound. */
  audio?: Blob
}

const FRAME_SIDE = 768
const FRAME_QUALITY = 0.65
const MIN_FRAMES = 8
const MAX_FRAMES = 36
const AUDIO_RATE = 16000
const SILENT_PEAK = 0.004
const OPEN_TIMEOUT = 12_000
const SEEK_TIMEOUT = 6_000
/** If taking the pictures takes longer than this the phone is struggling: the whole video is sent instead. */
const FRAMES_DEADLINE = 30_000

function waitFor(el: HTMLMediaElement, event: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => {
      clearTimeout(timer)
      el.removeEventListener(event, onEvent)
      el.removeEventListener('error', onError)
      fn()
    }
    const onEvent = () => done(resolve)
    const onError = () => done(() => reject(new LiteUnavailable('The browser cannot play this video.')))
    const timer = setTimeout(() => done(() => reject(new LiteUnavailable(`Timed out waiting for ${event}.`))), ms)
    el.addEventListener(event, onEvent)
    el.addEventListener('error', onError)
  })
}

async function seek(video: HTMLVideoElement, t: number): Promise<void> {
  const pending = waitFor(video, 'seeked', SEEK_TIMEOUT)
  video.currentTime = t
  await pending
}

/** Opens the video in a hidden element and finds its real duration (recordings made in a browser report "infinite" at first). */
async function open(blob: Blob): Promise<{ video: HTMLVideoElement; url: string; duration: number }> {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await waitFor(video, 'loadeddata', OPEN_TIMEOUT)
    if (!Number.isFinite(video.duration)) {
      await seek(video, 1e9) // jumping to the end makes the browser learn the length
      await seek(video, 0)
    }
    if (!Number.isFinite(video.duration) || video.duration < 0.5) throw new LiteUnavailable('Could not read the length of the video.')
    if (!video.videoWidth || !video.videoHeight) throw new LiteUnavailable('The video has no picture.')
    return { video, url, duration: video.duration }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

function jpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new LiteUnavailable('Could not make a picture.'))), 'image/jpeg', FRAME_QUALITY))
}

async function grabFrames(video: HTMLVideoElement, duration: number, count: number): Promise<Frame[]> {
  const scale = Math.min(1, FRAME_SIDE / Math.max(video.videoWidth, video.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new LiteUnavailable('Canvas is not available.')
  const frames: Frame[] = []
  const started = Date.now()
  for (let i = 0; i < count; i++) {
    if (Date.now() - started > FRAMES_DEADLINE) throw new LiteUnavailable('Taking pictures from the video is too slow on this phone.')
    const t = ((i + 0.5) * duration) / count
    try {
      await seek(video, t)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      frames.push({ t, blob: await jpeg(canvas) })
    } catch {
      /* this moment could not be read: the others still can */
    }
  }
  if (frames.length < Math.max(3, Math.floor(count / 2))) throw new LiteUnavailable('Could not read enough pictures from the video.')
  return frames
}

function wav(samples: Int16Array): Blob {
  const header = new ArrayBuffer(44)
  const v = new DataView(header)
  const text = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  v.setUint32(4, 36 + samples.byteLength, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, AUDIO_RATE, true)
  v.setUint32(28, AUDIO_RATE * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  text(36, 'data')
  v.setUint32(40, samples.byteLength, true)
  return new Blob([header, samples.buffer as ArrayBuffer], { type: 'audio/wav' })
}

/** The sound of the video as a 16 kHz mono WAV, or undefined when it is silent. */
async function soundOf(bytes: ArrayBuffer, durationSec: number): Promise<Blob | undefined> {
  const Offline = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
  if (!Offline) throw new LiteUnavailable('This browser cannot read the sound of a video.')
  let buffer: AudioBuffer
  try {
    // decoding through a 16 kHz context also resamples the sound to 16 kHz
    buffer = await new Offline(1, AUDIO_RATE, AUDIO_RATE).decodeAudioData(bytes.slice(0))
  } catch {
    throw new LiteUnavailable('Could not read the sound of the video.')
  }
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c))
  const out = new Int16Array(buffer.length)
  let peak = 0
  for (let i = 0; i < buffer.length; i++) {
    let s = 0
    for (const ch of channels) s += ch[i] ?? 0
    s /= channels.length
    peak = Math.max(peak, Math.abs(s))
    out[i] = Math.max(-1, Math.min(1, s)) * 0x7fff
  }
  if (peak < SILENT_PEAK) return undefined
  if (buffer.duration > durationSec * 2 + 5) throw new LiteUnavailable('The sound does not match the video.')
  return wav(out)
}

/** Keeps the pictures under `maxChars` of base64: fewer pictures first, then smaller ones. */
async function fit(frames: Frame[], maxChars: number): Promise<Frame[]> {
  const chars = (fs: Frame[]) => fs.reduce((n, f) => n + Math.ceil((f.blob.size * 4) / 3), 0)
  let list = frames
  while (chars(list) > maxChars && list.length > MIN_FRAMES * 2) list = list.filter((_, i) => i % 2 === 0)
  if (chars(list) > maxChars) {
    list = await Promise.all(list.map(async (f) => ({ t: f.t, blob: await compressImage(f.blob, 480, 0.5) })))
  }
  if (chars(list) > maxChars || list.length < MIN_FRAMES) throw new LiteUnavailable('The pictures do not fit in the request.')
  return list
}

/**
 * Makes the light copy of a video. `maxFrameChars` is how much of the request's picture budget the frames may use (the rest is
 * for the person's screenshots).
 */
export async function makeLite(bytes: ArrayBuffer, mimeType: string, maxFrameChars: number): Promise<LiteVideo> {
  const { video, url, duration } = await open(new Blob([bytes], { type: mimeType }))
  try {
    const count = Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, Math.round(duration / 2)))
    const frames = await fit(await grabFrames(video, duration, count), maxFrameChars)
    const audio = await soundOf(bytes, duration)
    return { durationSec: duration, frames, ...(audio ? { audio } : {}) }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
