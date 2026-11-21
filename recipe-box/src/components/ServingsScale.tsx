import { Minus, Plus } from '@phosphor-icons/react'

interface Props {
  /** Servings written on the recipe, or null when it does not say. */
  base: number | null
  /** The factor in use (1 = as saved). */
  factor: number
  onChange: (factor: number) => void
}

const MULTIPLIERS = [0.5, 1, 2, 3, 4]
const MAX_SERVINGS = 99

const fmtFactor = (f: number) => (f === 0.5 ? '½' : String(f))

/**
 * Changes the amounts for this visit only: nothing is saved, and opening another recipe (or coming back) starts from what the
 * recipe says. With servings on the recipe it steps the number of servings; without them it steps a batch multiplier.
 */
export function ServingsScale({ base, factor, onChange }: Props) {
  const changed = Math.abs(factor - 1) > 1e-9

  let shown: string
  let less: () => void
  let more: () => void
  let canLess: boolean
  let canMore: boolean
  if (base) {
    const n = Math.max(1, Math.round(base * factor))
    shown = String(n)
    canLess = n > 1
    canMore = n < MAX_SERVINGS
    less = () => onChange((n - 1) / base)
    more = () => onChange((n + 1) / base)
  } else {
    const i = Math.max(0, MULTIPLIERS.indexOf(factor))
    shown = `×${fmtFactor(MULTIPLIERS[i])}`
    canLess = i > 0
    canMore = i < MULTIPLIERS.length - 1
    less = () => onChange(MULTIPLIERS[i - 1])
    more = () => onChange(MULTIPLIERS[i + 1])
  }

  return (
    <div className="scale">
      <div className="scale__row" role="group" aria-label={base ? 'Servings' : 'Batch size'}>
        <span className="scale__label">{base ? 'Servings' : 'Batch'}</span>
        <button type="button" className="scale__btn" onClick={less} disabled={!canLess} aria-label={base ? 'Fewer servings' : 'Smaller batch'}>
          <Minus aria-hidden="true" weight="bold" />
        </button>
        <output className="scale__value" aria-live="polite" data-testid="scale-value">
          {shown}
        </output>
        <button type="button" className="scale__btn" onClick={more} disabled={!canMore} aria-label={base ? 'More servings' : 'Bigger batch'}>
          <Plus aria-hidden="true" weight="bold" />
        </button>
        {changed && (
          <button type="button" className="btn btn--ghost scale__reset" onClick={() => onChange(1)}>
            Back to {base ?? '×1'}
          </button>
        )}
      </div>
      {changed && (
        <p className="muted small" role="note">
          Amounts are scaled for this view only. The saved recipe is not changed, and the steps still use the original amounts.
        </p>
      )}
    </div>
  )
}
