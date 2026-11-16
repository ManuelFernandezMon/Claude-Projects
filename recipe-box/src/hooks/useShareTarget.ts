import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface ShareBridge {
  take?: () => string
}

/** The first web link inside shared text ("Check out this video! https://vm.tiktok.com/abc/"). */
export function linkInSharedText(text: string): string | undefined {
  const m = /https?:\/\/[^\s<>"']+/i.exec(text)
  return m ? m[0].replace(/[).,;!?]+$/, '') : undefined
}

/**
 * Android "Share > recipe-box": the app's native side keeps the shared text until the page asks for it. It is read when the
 * app starts and again whenever the app says another share arrived while it was open. Does nothing in a normal browser.
 */
export function useShareTarget() {
  const navigate = useNavigate()
  useEffect(() => {
    const take = () => {
      const bridge = (window as unknown as { RecipeBoxShare?: ShareBridge }).RecipeBoxShare
      let text = ''
      try {
        text = bridge?.take?.() ?? ''
      } catch {
        return
      }
      const link = linkInSharedText(text)
      if (link) navigate('/import', { state: { sharedLink: link } })
    }
    take()
    window.addEventListener('recipebox-share', take)
    return () => window.removeEventListener('recipebox-share', take)
  }, [navigate])
}
