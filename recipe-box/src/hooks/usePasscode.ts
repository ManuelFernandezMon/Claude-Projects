import { useState, useSyncExternalStore } from 'react'
import { ACCOUNT_PASSCODE, aiViaAccount, markAccountDenied, onAiAccountChange } from '../lib/aiAuth'
import { loadPasscode, savePasscode } from '../lib/importApi'

/**
 * Passcode for the AI endpoints, remembered on this device after a successful call. When someone is signed in, their account
 * can stand in for it (the server decides whether that account is allowed), so nothing has to be typed.
 */
export function usePasscode() {
  const viaAccount = useSyncExternalStore(onAiAccountChange, aiViaAccount)
  const [typed, setPasscode] = useState(loadPasscode)
  const [editing, setEditing] = useState(() => loadPasscode() === '')
  const useAccount = viaAccount && typed === ''
  return {
    passcode: useAccount ? ACCOUNT_PASSCODE : typed,
    setPasscode,
    editing: useAccount ? false : editing,
    setEditing,
    remember: () => {
      if (useAccount) return // nothing typed: the account worked, there is nothing to save
      savePasscode(typed)
      setEditing(false)
    },
    forget: () => {
      if (useAccount) {
        markAccountDenied() // this account is not on the server's list: ask for the passcode instead
        setEditing(true)
        return
      }
      setPasscode('')
      setEditing(true)
      savePasscode('')
    },
  }
}
