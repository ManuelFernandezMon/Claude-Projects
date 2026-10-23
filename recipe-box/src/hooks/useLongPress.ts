import { useCallback, useRef, type MouseEvent, type PointerEvent } from 'react'

const HOLD_MS = 450

/** Counts pointer presses. Lets the sheet tell "the click from the press that opened me" from a later, deliberate tap. */
let gestureSeq = 0
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => gestureSeq++, true)
export const currentGesture = (): number => gestureSeq
const MOVE_TOLERANCE = 10

/**
 * Press-and-hold for touch and pen, plus the browser's own context-menu gesture (right click, the Menu key,
 * Shift+F10, and Android's long press). The click that follows a hold is swallowed so the card does not also open.
 */
export function useLongPress(onTrigger: () => void) {
  const timer = useRef<number>(undefined)
  const origin = useRef<{ x: number; y: number }>(undefined)
  const swallowClick = useRef(false)
  const lastFired = useRef(0)

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current)
    origin.current = undefined
  }, [])

  const fire = useCallback(() => {
    // Android fires both our timer and a contextmenu event for one hold: only the first counts.
    if (Date.now() - lastFired.current < 350) return
    lastFired.current = Date.now()
    swallowClick.current = true
    window.setTimeout(() => (swallowClick.current = false), 700)
    try {
      navigator.vibrate?.(12)
    } catch {
      /* haptics are optional */
    }
    onTrigger()
  }, [onTrigger])

  return {
    onPointerDown: (e: PointerEvent) => {
      swallowClick.current = false
      if (e.pointerType === 'mouse') return // mouse users right-click
      origin.current = { x: e.clientX, y: e.clientY }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(fire, HOLD_MS)
    },
    onPointerMove: (e: PointerEvent) => {
      const o = origin.current
      if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_TOLERANCE) cancel() // it is a scroll, not a hold
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault() // no browser link/image menu on top of ours
      cancel()
      fire()
    },
    onClickCapture: (e: MouseEvent) => {
      if (swallowClick.current) {
        e.preventDefault()
        e.stopPropagation()
        swallowClick.current = false
      }
    },
  }
}
