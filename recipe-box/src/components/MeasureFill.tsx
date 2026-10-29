import { useState } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { usePasscode } from '../hooks/usePasscode'
import { ImportError, convertIngredients } from '../lib/importApi'
import { mergeConversions } from '../lib/measures'
import { toast } from '../lib/toast'
import { recipeStore } from '../storage/recipeStore'
import type { Recipe } from '../types'
import { PasscodeField } from './PasscodeField'

interface Props {
  recipe: Recipe
  onSaved: (recipe: Recipe) => void
}

/**
 * Cups of flour to grams cannot be done by arithmetic: it depends on the ingredient. This asks the AI once, saves the
 * answer on the recipe (so it works offline afterwards) and marks estimates with ≈.
 */
export function MeasureFill({ recipe, onSaved }: Props) {
  const pc = usePasscode()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function run() {
    setBusy(true)
    setError(undefined)
    try {
      const converted = await convertIngredients(
        recipe.ingredients.map((i) => ({ quantity: i.quantity ?? '', name: i.name })),
        pc.passcode,
      )
      pc.remember()
      const merged = mergeConversions(recipe.ingredients, converted)
      if (!merged) throw new ImportError('The AI answer did not match the ingredient list, so nothing was changed. Try again.', 'mismatch')
      const updated: Recipe = { ...recipe, ingredients: merged }
      await recipeStore.saveRecipe(updated)
      onSaved(updated)
      toast('Measurements added')
    } catch (e) {
      if (e instanceof ImportError && e.code === 'unauthorized') pc.forget()
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fill panel stack stack--tight">
      <p className="small">
        Turning grams into cups (or cups into grams) depends on the ingredient, so it cannot be calculated. The AI can estimate it
        once and the recipe remembers it, even offline. Estimates are marked ≈.
      </p>
      <PasscodeField value={pc.passcode} onChange={pc.setPasscode} editing={pc.editing} onEdit={() => pc.setEditing(true)} />
      <div className="row">
        <button type="button" className="btn" onClick={() => void run()} disabled={busy || !pc.passcode}>
          <Sparkle aria-hidden="true" />
          {busy ? 'Converting…' : 'Add measurements with AI'}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
