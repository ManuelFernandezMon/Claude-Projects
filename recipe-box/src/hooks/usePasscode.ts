import { useState } from 'react'
import { loadPasscode, savePasscode } from '../lib/importApi'

/** Passcode for the AI endpoints, remembered on this device after a successful call. */
export function usePasscode() {
  const [passcode, setPasscode] = useState(loadPasscode)
  const [editing, setEditing] = useState(() => loadPasscode() === '')
  return {
    passcode,
    setPasscode,
    editing,
    setEditing,
    remember: () => {
      savePasscode(passcode)
      setEditing(false)
    },
    forget: () => {
      setPasscode('')
      setEditing(true)
      savePasscode('')
    },
  }
}
