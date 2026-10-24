import { useCallback, useEffect, useState } from 'react'
import { isNativeApp } from '../lib/apiBase'
import { INSTALLED_VERSION, fetchLatestVersion, isNewer } from '../lib/update'

export type UpdateState =
  | { status: 'idle' } // not the installed app, so there is nothing to update
  | { status: 'checking' }
  | { status: 'current' }
  | { status: 'available'; latest: string }
  | { status: 'unknown' } // offline or the site did not answer

// One check per app session unless asked again, so moving between screens does not hit the network each time.
let last: { at: number; latest: string | undefined } | undefined

/**
 * Only the installed Android app needs this: the website is always the newest version, but the app is a copy that is
 * updated by downloading the APK again.
 */
export function useUpdateCheck(): UpdateState & { recheck: () => void } {
  const enabled = isNativeApp()
  const [state, setState] = useState<UpdateState>(() => (enabled ? { status: 'checking' } : { status: 'idle' }))

  const run = useCallback(
    async (force: boolean) => {
      if (!enabled) return
      if (!force && last && Date.now() - last.at < 10 * 60_000) {
        setState(describe(last.latest))
        return
      }
      setState({ status: 'checking' })
      const latest = await fetchLatestVersion()
      last = { at: Date.now(), latest }
      setState(describe(latest))
    },
    [enabled],
  )

  useEffect(() => {
    void run(false)
  }, [run])

  return { ...state, recheck: () => void run(true) }
}

function describe(latest: string | undefined): UpdateState {
  if (!latest) return { status: 'unknown' }
  return isNewer(latest, INSTALLED_VERSION) ? { status: 'available', latest } : { status: 'current' }
}
