/**
 * How the app proves itself to the AI endpoints: the shared passcode, or the signed-in account (the server checks the
 * account's email against its list). The account's token is read when a request is made, so it is always fresh.
 */
let tokenProvider: (() => Promise<string | undefined>) | null = null
let accountOk = false
let denied = false
const listeners = new Set<() => void>()

/** The sign-in code registers how to get a current token (or null when nobody is signed in). */
export function setAiAccount(provider: (() => Promise<string | undefined>) | null): void {
  tokenProvider = provider
  accountOk = provider !== null
  if (!accountOk) denied = false
  listeners.forEach((l) => l())
}

/** True when the account may be used instead of a passcode (signed in, and the server has not refused it). */
export const aiViaAccount = (): boolean => accountOk && !denied

/** The server said this account is not on its list: ask for the passcode instead. */
export function markAccountDenied(): void {
  if (denied) return
  denied = true
  listeners.forEach((l) => l())
}

export function onAiAccountChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Headers that identify the caller. The passcode is sent too, so either way works. */
export async function aiHeaders(passcode: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'x-import-passcode': passcode }
  if (tokenProvider) {
    try {
      const token = await tokenProvider()
      if (token) headers.authorization = `Bearer ${token}`
    } catch {
      /* no token: the passcode alone */
    }
  }
  return headers
}

/** Stands in for the passcode in screens while the account is used (it is never saved). */
export const ACCOUNT_PASSCODE = 'account'
