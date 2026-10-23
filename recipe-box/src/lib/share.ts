import { Share } from '@capacitor/share'

/** Copies text to the clipboard. Falls back to a hidden textarea where the async clipboard API is missing or blocked. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    /* fall through to the legacy path */
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('Copying is not allowed here.')
}

export type ShareResult = 'shared' | 'copied' | 'cancelled'

/** Opens the system share sheet (Android app, or a browser that has one); otherwise copies the text. */
export async function shareText(title: string, text: string): Promise<ShareResult> {
  const { value: canShare } = await Share.canShare().catch(() => ({ value: false }))
  if (!canShare) {
    await copyText(text)
    return 'copied'
  }
  try {
    await Share.share({ title, text, dialogTitle: 'Share recipe' })
    return 'shared'
  } catch (e) {
    if (e instanceof Error && /cancel|abort/i.test(`${e.name} ${e.message}`)) return 'cancelled'
    throw e
  }
}
