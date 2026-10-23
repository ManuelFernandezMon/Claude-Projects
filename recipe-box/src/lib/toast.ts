/** Tiny event bus so any code can show a brief confirmation without prop drilling. */
const EVENT = 'recipe-box:toast'

export function toast(message: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }))
}

export function onToast(handler: (message: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
