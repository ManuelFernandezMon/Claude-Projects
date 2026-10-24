/** iPhone, iPad or iPod (an iPad can report itself as a Mac, so touch support is checked too). */
export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** True when the site was opened from a Home Screen icon (an installed web app) rather than a browser tab. */
export function isStandalone(): boolean {
  try {
    return (navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  } catch {
    return false
  }
}
