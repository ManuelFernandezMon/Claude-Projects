import { UNIT_MODES, type UnitMode } from '../lib/measures'

interface Props {
  value: UnitMode
  onChange: (mode: UnitMode) => void
}

/** A segmented control: one choice, shown as a row of round options. Real radio inputs, so the keyboard works as usual. */
export function UnitToggle({ value, onChange }: Props) {
  return (
    <fieldset className="seg">
      <legend className="sr-only">Show measurements as</legend>
      {UNIT_MODES.map((m) => (
        <label key={m.value} className={`seg__opt${value === m.value ? ' seg__opt--on' : ''}`}>
          <input type="radio" name="unit-mode" value={m.value} checked={value === m.value} onChange={() => onChange(m.value)} />
          <span>{m.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
