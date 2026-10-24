import { useEffect, useRef } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { useLocation, useNavigate } from 'react-router-dom'
import { isNativeApp } from '../lib/apiBase'

/** Closes the topmost open dialog the way the Escape key does. Returns true when there was one. */
function closeOpenDialog(): boolean {
  const dialogs = document.querySelectorAll('dialog[open]')
  const top = dialogs[dialogs.length - 1]
  if (!(top instanceof HTMLDialogElement)) return false
  const cancel = new Event('cancel', { cancelable: true })
  top.dispatchEvent(cancel)
  if (!cancel.defaultPrevented) top.close()
  return true
}

/**
 * The phone's Back button. Without this the Android app simply exits (the WebView has no handler of its own):
 * first it closes an open sheet or dialog, then it goes back a screen, and only on the home screen does it leave the app.
 */
export function useAndroidBack() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const where = useRef(pathname)
  where.current = pathname

  useEffect(() => {
    if (!isNativeApp()) return
    let handle: PluginListenerHandle | undefined
    let stopped = false
    void CapacitorApp.addListener('backButton', () => {
      if (closeOpenDialog()) return
      if (where.current === '/') {
        void CapacitorApp.exitApp()
        return
      }
      // react-router keeps the position in its own history stack; at 0 there is nothing earlier inside the app
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (idx > 0) navigate(-1)
      else navigate('/', { replace: true })
    })
      .then((h) => {
        if (stopped) void h.remove()
        else handle = h
      })
      .catch(() => undefined) // plugin missing from this build: Back just keeps its default behavior
    return () => {
      stopped = true
      void handle?.remove()
    }
  }, [navigate])
}
