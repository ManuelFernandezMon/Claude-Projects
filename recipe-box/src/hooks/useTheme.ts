import { useCallback, useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'recipe-box:theme'
const listeners = new Set<() => void>()

function stored(): Theme | undefined {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : undefined
  } catch {
    return undefined // storage unavailable: follow the system
  }
}

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')

/** The theme in effect: the saved choice, otherwise the system's. */
export const currentTheme = (): Theme => stored() ?? systemTheme()

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  // the browser/Android status bar color follows the page
  const bg = theme === 'light' ? '#eceef2' : '#0a0b0e'
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.removeAttribute('media')
    m.setAttribute('content', bg)
  })
}

/** Called once at startup: re-applies a saved choice (index.html already did it before first paint). */
export function initTheme() {
  const t = stored()
  if (t) apply(t)
  // when nothing is saved, a system change must still reach components that show the current theme
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => listeners.forEach((l) => l()))
}

function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* not saved: the choice lasts until the app is closed */
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // A short color fade. The page is NOT cross-faded with a view transition here: that takes a snapshot of the whole screen,
  // and Android's WebView draws it incompletely (blank blocks over the glass panels).
  const root = document.documentElement
  if (!reduce) {
    root.classList.add('theme-fade')
    window.setTimeout(() => root.classList.remove('theme-fade'), 400)
  }
  apply(theme)
  listeners.forEach((l) => l())
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    currentTheme,
  )
  const toggle = useCallback(() => setTheme(currentTheme() === 'light' ? 'dark' : 'light'), [])
  return { theme, toggle }
}
