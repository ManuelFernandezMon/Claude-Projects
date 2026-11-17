import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useNavigate } from 'react-router-dom'

interface ShareBridge {
  take?: () => string
}

/** A video or screenshot the phone handed over: where the page can read it, its name and its type. */
export interface SharedFile {
  url: string
  name: string
  mime: string
}

/** The first web link inside shared text ("Check out this video! https://vm.tiktok.com/abc/"). */
export function linkInSharedText(text: string): string | undefined {
  const m = /https?:\/\/[^\s<>"']+/i.exec(text)
  return m ? m[0].replace(/[).,;!?]+$/, '') : undefined
}

/**
 * Android "Share > recipe-box": the app's native side keeps what was shared (a link, or a video or screenshot copied into the
 * app's cache) until the page asks for it. It is read when the app starts and again whenever the app says another share
 * arrived while it was open. Does nothing in a normal browser.
 */
export function useShareTarget() {
  const navigate = useNavigate()
  useEffect(() => {
    const take = () => {
      const bridge = (window as unknown as { RecipeBoxShare?: ShareBridge }).RecipeBoxShare
      let raw = ''
      try {
        raw = bridge?.take?.() ?? ''
      } catch {
        return
      }
      if (!raw) return
      let data: { text?: string; error?: string; file?: { path?: string; url?: string; name?: string; mime?: string } }
      try {
        data = JSON.parse(raw)
      } catch {
        data = { text: raw } // an older build handed over the bare text
      }
      if (data.error) {
        navigate('/import', { state: { sharedError: data.error } })
      } else if (data.file && (data.file.url || data.file.path)) {
        const f = data.file
        const url = f.url ?? Capacitor.convertFileSrc(`file://${f.path}`)
        navigate('/import', { state: { sharedFile: { url, name: f.name ?? 'shared', mime: f.mime ?? '' } satisfies SharedFile } })
      } else if (data.text) {
        const link = linkInSharedText(data.text)
        if (link) navigate('/import', { state: { sharedLink: link } })
      }
    }
    take()
    window.addEventListener('recipebox-share', take)
    return () => window.removeEventListener('recipebox-share', take)
  }, [navigate])
}
