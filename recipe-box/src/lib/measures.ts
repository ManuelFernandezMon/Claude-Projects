import type { Ingredient, ImportedRecipe } from '../types'
import { convertLocal, parseQuantity, unitKind, unitSystem, type System } from './units'

/** How ingredient amounts are shown: as written, in one system, in US cups and spoons, or as written plus the other system. */
export type UnitMode = 'written' | 'metric' | 'us' | 'cups' | 'both'

export interface ShownQuantity {
  text: string
  /** The other system in brackets ("both" mode only). */
  extra?: string
  /** True when the shown value is an estimate (rounded to a practical measure, or weight-from-volume). */
  approx: boolean
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function inSystem(ing: Ingredient, system: System): { text: string; approx: boolean } | undefined {
  const original = (ing.quantity ?? '').trim()
  const stored = ing.measures?.[system]?.trim()
  if (stored) return { text: stored, approx: !!ing.measures?.approx && !same(stored, original) }
  if (!original) return undefined
  return convertLocal(original, system)
}

/** Cups and spoons: what is already measured that way stays; ml and litres are converted on the device; weights need the AI. */
function inCups(ing: Ingredient): { text: string; approx: boolean } | undefined {
  const original = (ing.quantity ?? '').trim()
  const stored = ing.measures?.cups?.trim()
  if (stored) return { text: stored, approx: !!ing.measures?.approx && !same(stored, original) }
  if (!original) return undefined
  const p = parseQuantity(original)
  if (!p || unitKind(original) !== 'volume') return undefined // a weight, a count or free text
  return convertLocal(original, 'us')
}

/**
 * A bare number with no unit ("175") that is probably a weight in grams (or millilitres): counts like "3 eggs" are small,
 * amounts people weigh are not. Only the AI can say what it means for a given ingredient.
 */
const isBareNumber = (q: string) => /^\s*\d+(?:[.,]\d+)?\s*$/.test(q) && parseFloat(q.replace(',', '.')) >= 20

export function showQuantity(ing: Ingredient, mode: UnitMode): ShownQuantity {
  const original = (ing.quantity ?? '').trim()
  if (mode === 'written') return { text: original, approx: false }

  if (mode === 'cups') {
    const r = inCups(ing)
    return r ? { text: r.text, approx: r.approx && !same(r.text, original) } : { text: original, approx: false }
  }

  if (mode === 'metric' || mode === 'us') {
    const r = inSystem(ing, mode)
    return r ? { text: r.text, approx: r.approx && !same(r.text, original) } : { text: original, approx: false }
  }

  // both: what is written, plus the other system
  const other: System = unitSystem(original) === 'metric' ? 'us' : 'metric'
  const r = inSystem(ing, other)
  if (!r || same(r.text, original)) return { text: original, approx: false }
  return { text: original, extra: r.text, approx: r.approx }
}

/**
 * Volume to weight (cups of flour to grams) and weight to volume cannot be done by arithmetic: they depend on the
 * ingredient. True when the AI could improve what is shown for this mode.
 */
export function needsAi(ingredients: Ingredient[], mode: UnitMode): boolean {
  if (mode === 'written') return false
  // cups: every weight (and every bare number, which the AI reads as grams or a count) that the AI has not looked at yet
  if (mode === 'cups') {
    return ingredients.some((i) => !!i.quantity && !i.measures?.volume && (unitKind(i.quantity) === 'weight' || isBareNumber(i.quantity)))
  }
  const wantsWeight = mode === 'metric' || mode === 'both'
  const wantsVolume = mode === 'us' || mode === 'both'
  return ingredients.some((i) => {
    if (i.measures?.metric || i.measures?.us || !i.quantity) return false
    const kind = unitKind(i.quantity)
    return (wantsWeight && kind === 'volume') || (wantsVolume && kind === 'weight')
  })
}

/** True when at least one amount can be shown in another unit at all (decides whether the switch is worth showing). */
export function canConvert(ingredients: Ingredient[]): boolean {
  return ingredients.some(
    (i) => !!i.measures?.metric || !!i.measures?.us || !!i.measures?.cups || (!!i.quantity && (parseQuantity(i.quantity) !== null || isBareNumber(i.quantity))),
  )
}

/** Copies AI conversions onto the ingredients. Null when the answer does not line up with the list (never guess). */
export function mergeConversions(ingredients: Ingredient[], converted: ImportedRecipe['ingredients']): Ingredient[] | null {
  if (converted.length !== ingredients.length) return null
  const out: Ingredient[] = []
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i]
    const c = converted[i]
    if (!same(ing.name, c.name)) return null
    // `volume` records that the AI has looked at this ingredient, so an empty answer (eggs, meat) is not asked about again
    const measures = {
      ...(c.metric ? { metric: c.metric } : {}),
      ...(c.us ? { us: c.us } : {}),
      ...(c.cups ? { cups: c.cups } : {}),
      ...(c.approximate && (c.metric || c.us || c.cups) ? { approx: true } : {}),
      volume: true as const,
    }
    out.push({ ...ing, measures })
  }
  return out
}

export const UNIT_MODE_KEY = 'recipe-box:unit-mode'
export const UNIT_MODES: { value: UnitMode; label: string }[] = [
  { value: 'written', label: 'Original' },
  { value: 'metric', label: 'Metric' },
  { value: 'us', label: 'US' },
  { value: 'cups', label: 'Cups' },
  { value: 'both', label: 'Both' },
]
