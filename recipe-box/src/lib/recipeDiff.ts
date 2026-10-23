import type { ImportedRecipe, Ingredient, Recipe } from '../types'
import { newId } from './id'

/** The shape the AI endpoint works with. Photos, categories and the source link never go to the AI. */
export function toImported(recipe: Recipe): ImportedRecipe {
  return {
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients.map((i) => ({ quantity: i.quantity ?? '', name: i.name })),
    steps: recipe.steps,
    prepMinutes: recipe.prepMinutes ?? null,
    cookMinutes: recipe.cookMinutes ?? null,
    servings: recipe.servings ?? null,
    categoryNames: [],
  }
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export type DiffKind = 'same' | 'added' | 'changed' | 'removed'
export interface DiffLine {
  kind: DiffKind
  text: string
  /** What it said before, for "changed". */
  was?: string
}

export interface RecipeDiff {
  title?: { from: string; to: string }
  description: boolean
  facts: { label: string; from: string; to: string }[]
  ingredients: DiffLine[]
  steps: DiffLine[]
  changes: number
}

const line = (q: string, name: string) => [q.trim(), name.trim()].filter(Boolean).join(' ')

/** Longest-common-subsequence diff of two lists of strings, with a removed line followed by an added one shown as "changed". */
function diffLines(before: string[], after: string[]): DiffLine[] {
  const n = before.length
  const m = after.length
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i][j] = norm(before[i]) === norm(after[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1])
    }
  }
  const raw: { op: 'same' | 'del' | 'add'; text: string }[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (norm(before[i]) === norm(after[j])) {
      raw.push({ op: 'same', text: after[j] })
      i++
      j++
    } else if (t[i + 1][j] >= t[i][j + 1]) raw.push({ op: 'del', text: before[i++] })
    else raw.push({ op: 'add', text: after[j++] })
  }
  while (i < n) raw.push({ op: 'del', text: before[i++] })
  while (j < m) raw.push({ op: 'add', text: after[j++] })

  const out: DiffLine[] = []
  for (let k = 0; k < raw.length; k++) {
    const cur = raw[k]
    if (cur.op === 'same') {
      out.push({ kind: 'same', text: cur.text })
      continue
    }
    if (cur.op === 'del') {
      // pair a run of removals with the run of additions that follows: those are rewrites, not deletions
      const dels: string[] = []
      while (k < raw.length && raw[k].op === 'del') dels.push(raw[k++].text)
      const adds: string[] = []
      while (k < raw.length && raw[k].op === 'add') adds.push(raw[k++].text)
      k--
      const pairs = Math.min(dels.length, adds.length)
      for (let p = 0; p < pairs; p++) out.push({ kind: 'changed', text: adds[p], was: dels[p] })
      for (let p = pairs; p < dels.length; p++) out.push({ kind: 'removed', text: dels[p] })
      for (let p = pairs; p < adds.length; p++) out.push({ kind: 'added', text: adds[p] })
    } else out.push({ kind: 'added', text: cur.text })
  }
  return out
}

function diffIngredients(before: Ingredient[], after: ImportedRecipe['ingredients']): DiffLine[] {
  const pool = before.map((b) => ({ b, used: false }))
  const out: DiffLine[] = []
  for (const a of after) {
    const hit = pool.find((p) => !p.used && norm(p.b.name) === norm(a.name))
    if (!hit) {
      out.push({ kind: 'added', text: line(a.quantity, a.name) })
      continue
    }
    hit.used = true
    out.push(
      norm(hit.b.quantity ?? '') === norm(a.quantity)
        ? { kind: 'same', text: line(a.quantity, a.name) }
        : { kind: 'changed', text: line(a.quantity, a.name), was: line(hit.b.quantity ?? '', hit.b.name) },
    )
  }
  for (const p of pool) if (!p.used) out.push({ kind: 'removed', text: line(p.b.quantity ?? '', p.b.name) })
  return out
}

export function diffRecipes(original: Recipe, proposal: ImportedRecipe): RecipeDiff {
  const facts: RecipeDiff['facts'] = []
  const fact = (label: string, from: number | undefined, to: number | null) => {
    if (to !== null && to !== (from ?? null)) facts.push({ label, from: from ? String(from) : 'not set', to: String(to) })
  }
  fact('Servings', original.servings, proposal.servings)
  fact('Prep (min)', original.prepMinutes, proposal.prepMinutes)
  fact('Cook (min)', original.cookMinutes, proposal.cookMinutes)

  const ingredients = diffIngredients(original.ingredients, proposal.ingredients)
  const steps = diffLines(original.steps, proposal.steps)
  const title = norm(proposal.title) !== norm(original.title) && proposal.title.trim() ? { from: original.title, to: proposal.title.trim() } : undefined
  const description = norm(proposal.description) !== norm(original.description)
  const changes =
    facts.length + (title ? 1 : 0) + (description ? 1 : 0) + ingredients.filter((l) => l.kind !== 'same').length + steps.filter((l) => l.kind !== 'same').length
  return { title, description, facts, ingredients, steps, changes }
}

/**
 * Builds the updated recipe. Ingredients that did not change keep their id (so ticked boxes stay ticked) and their stored
 * conversions; changed or new ones start fresh. Photos, categories, source link and dates are carried over untouched.
 */
export function applyProposal(original: Recipe, proposal: ImportedRecipe): Recipe {
  const pool = original.ingredients.map((ing) => ({ ing, used: false }))
  const ingredients: Ingredient[] = proposal.ingredients
    .filter((a) => a.name.trim())
    .map((a) => {
      const hit = pool.find((p) => !p.used && norm(p.ing.name) === norm(a.name) && norm(p.ing.quantity ?? '') === norm(a.quantity))
      if (hit) {
        hit.used = true
        return hit.ing
      }
      return { id: newId(), name: a.name.trim(), quantity: a.quantity.trim() || undefined }
    })
  return {
    ...original,
    title: proposal.title.trim() || original.title,
    description: proposal.description.trim(),
    steps: proposal.steps.map((s) => s.trim()).filter(Boolean),
    ingredients,
    checked: original.checked.filter((id) => ingredients.some((i) => i.id === id)),
    prepMinutes: proposal.prepMinutes && proposal.prepMinutes > 0 ? Math.round(proposal.prepMinutes) : original.prepMinutes,
    cookMinutes: proposal.cookMinutes && proposal.cookMinutes > 0 ? Math.round(proposal.cookMinutes) : original.cookMinutes,
    servings: proposal.servings && proposal.servings > 0 ? Math.round(proposal.servings) : original.servings,
    aiEdited: true,
    updatedAt: Date.now(),
  }
}
