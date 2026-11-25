import { useSyncExternalStore } from 'react'
import { ACCOUNT_PASSCODE, aiViaAccount, onAiAccountChange } from '../lib/aiAuth'

interface Props {
  value: string
  onChange: (v: string) => void
  editing: boolean
  onEdit: () => void
}

export function PasscodeField({ value, onChange, editing, onEdit }: Props) {
  const viaAccount = useSyncExternalStore(onAiAccountChange, aiViaAccount)
  if (viaAccount && value === ACCOUNT_PASSCODE) {
    return <p className="muted small">The AI works through your account, no passcode needed.</p>
  }
  if (!editing) {
    return (
      <p className="muted small">
        Passcode saved on this device.{' '}
        <button type="button" className="link-btn" onClick={onEdit}>
          Change
        </button>
      </p>
    )
  }
  return (
    <div className="field">
      <label htmlFor="ai-pass">Passcode</label>
      <input
        id="ai-pass"
        className="input"
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="muted small">
        Set as <code>RECIPE_IMPORT_PASSCODE</code> on the server. It is stored only on this device.
      </span>
    </div>
  )
}
