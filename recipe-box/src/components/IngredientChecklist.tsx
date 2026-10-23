import { useState, type ReactNode } from 'react'
import { recipeStore } from '../storage/recipeStore'
import type { Ingredient } from '../types'
import { errorMessage } from '../lib/format'
import { showQuantity, type UnitMode } from '../lib/measures'

interface Props {
  recipeId: string
  ingredients: Ingredient[]
  initialChecked: string[]
  mode?: UnitMode
  /** Rendered under the heading (the unit switch). */
  controls?: ReactNode
  /** Rendered under the list (the AI measurement helper). */
  footer?: ReactNode
}

export function IngredientChecklist({ recipeId, ingredients, initialChecked, mode = 'written', controls, footer }: Props) {
  const [checked, setChecked] = useState<string[]>(initialChecked)
  const [error, setError] = useState<string>()

  async function persist(next: string[]) {
    const prev = checked
    setChecked(next)
    try {
      await recipeStore.setChecked(recipeId, next)
      setError(undefined)
    } catch (e) {
      setChecked(prev)
      setError(`Could not save: ${errorMessage(e)}`)
    }
  }

  function toggle(id: string) {
    void persist(checked.includes(id) ? checked.filter((c) => c !== id) : [...checked, id])
  }

  const done = ingredients.filter((i) => checked.includes(i.id)).length

  return (
    <section aria-labelledby="ingredients-h">
      <div className="section-head">
        <h2 id="ingredients-h" className="h2">
          Ingredients
        </h2>
        {ingredients.length > 0 && (
          <span className="muted mono" aria-live="polite">
            {done}/{ingredients.length}
          </span>
        )}
      </div>
      {controls}
      {ingredients.length === 0 ? (
        <p className="muted">No ingredients listed.</p>
      ) : (
        <>
          <ul className="checklist">
            {ingredients.map((ing) => {
              const on = checked.includes(ing.id)
              const shown = showQuantity(ing, mode)
              return (
                <li key={ing.id}>
                  <label className={`check${on ? ' check--on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(ing.id)} />
                    <span className="check__text">
                      {shown.text && (
                        <span className="check__qty">
                          {shown.approx && !shown.extra ? '≈ ' : ''}
                          {shown.text}
                        </span>
                      )}
                      <span>{ing.name}</span>
                      {shown.extra && (
                        <span className="check__alt">
                          ({shown.approx ? '≈ ' : ''}
                          {shown.extra})
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <button type="button" className="btn btn--ghost" onClick={() => void persist([])} disabled={done === 0}>
            Reset checklist
          </button>
        </>
      )}
      {footer}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
