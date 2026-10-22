/** Returns the URL string only if it is a valid http(s) URL; guards against javascript: and similar. */
export function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const u = new URL(value.trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined
  } catch {
    return undefined
  }
}

export type SourceKind = 'tiktok' | 'instagram' | 'other'

export function sourceKind(url: string): SourceKind {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok'
    if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') return 'instagram'
  } catch {
    /* fall through */
  }
  return 'other'
}
