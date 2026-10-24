import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import { useLocation, useParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { recipeStore } from '../storage/recipeStore'
import type { Ingredient, Recipe, RecipePrefill } from '../types'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { CategoryChip } from '../components/CategoryChip'
import { EmptyState } from '../components/EmptyState'
import { ImagePicker, type ImageItem } from '../components/ImagePicker'
import { Spinner } from '../components/Spinner'
import { newId } from '../lib/id'
import { errorMessage } from '../lib/format'
import { safeHttpUrl } from '../lib/url'

interface StepDraft {
  id: string
  text: string
}

interface Draft {
  title: string
  description: string
  prep: string
  cook: string
  servings: string
  categoryIds: string[]
  ingredients: Ingredient[]
  steps: StepDraft[]
  images: ImageItem[]
  sourceUrl: string
  aiGenerated: boolean
}

const emptyDraft = (prefill?: RecipePrefill): Draft => ({
  title: prefill?.title ?? '',
  description: prefill?.description ?? '',
  prep: prefill?.prep ?? '',
  cook: prefill?.cook ?? '',
  servings: prefill?.servings ?? '',
  categoryIds: prefill?.categoryIds ?? [],
  ingredients: prefill?.ingredients.length ? prefill.ingredients : [{ id: newId(), name: '' }],
  steps: (prefill?.steps.length ? prefill.steps : ['']).map((text) => ({ id: newId(), text })),
  images: [],
  sourceUrl: prefill?.sourceUrl ?? '',
  aiGenerated: prefill?.aiGenerated === true,
})

const creditsOf = (images: ImageItem[]): Recipe['photoCredits'] => {
  const entries = images.flatMap((i) => (i.credit ? [[i.id, i.credit] as const] : []))
  return entries.length ? Object.fromEntries(entries) : undefined
}

const toNum = (s: string): number | undefined => {
  const n = Number(s)
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

export function RecipeEditPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const prefill = (useLocation().state as { prefill?: RecipePrefill } | null)?.prefill
  const { categories, refresh } = useData()
  const [original, setOriginal] = useState<Recipe>()
  const [draft, setDraft] = useState<Draft | undefined>(isNew ? emptyDraft(prefill) : undefined)
  const [loadError, setLoadError] = useState<string>()
  const [saveError, setSaveError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [focusId, setFocusId] = useState<string>()
  const newRecipeId = useRef(newId())
  useDocumentTitle(isNew ? 'New recipe' : original ? `Edit ${original.title}` : 'Edit recipe')

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await recipeStore.getRecipe(id)
        if (!r) throw new Error('Recipe not found.')
        const blobs = await Promise.all(r.imageIds.map((iid) => recipeStore.getImageBlob(iid)))
        if (cancelled) return
        setOriginal(r)
        setDraft({
          title: r.title,
          description: r.description,
          prep: r.prepMinutes?.toString() ?? '',
          cook: r.cookMinutes?.toString() ?? '',
          servings: r.servings?.toString() ?? '',
          categoryIds: r.categoryIds,
          ingredients: r.ingredients.length ? r.ingredients : [{ id: newId(), name: '' }],
          steps: (r.steps.length ? r.steps : ['']).map((text) => ({ id: newId(), text })),
          images: r.imageIds.flatMap((iid, i) => (blobs[i] ? [{ id: iid, blob: blobs[i], ...(r.photoCredits?.[iid] ? { credit: r.photoCredits[iid] } : {}) }] : [])),
          sourceUrl: r.sourceUrl ?? '',
          aiGenerated: r.aiGenerated === true,
        })
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  if (loadError) {
    return (
      <EmptyState
        title="Can’t edit this recipe"
        action={
          <Link to="/" className="btn">
            Back to recipes
          </Link>
        }
      >
        {loadError}
      </EmptyState>
    )
  }
  if (!draft) return <Spinner />

  const d = draft
  const update = (patch: Partial<Draft>) => setDraft({ ...d, ...patch })
  const titleMissing = d.title.trim() === ''

  async function save(e: FormEvent) {
    e.preventDefault()
    if (titleMissing) return
    setSaving(true)
    setSaveError(undefined)
    try {
      const recipeId = original?.id ?? newRecipeId.current
      const now = Date.now()
      const ingredients = d.ingredients
        .map((i) => {
          const name = i.name.trim()
          const quantity = i.quantity?.trim() || undefined
          // stored conversions describe the old amount: keep them only while the ingredient is untouched
          const before = original?.ingredients.find((o) => o.id === i.id)
          const untouched = before && before.name === name && (before.quantity ?? '') === (quantity ?? '')
          return { id: i.id, name, quantity, ...(untouched && before.measures ? { measures: before.measures } : {}) }
        })
        .filter((i) => i.name)
      const originalIds = new Set(original?.imageIds ?? [])
      const currentIds = new Set(d.images.map((i) => i.id))
      const recipe: Recipe = {
        id: recipeId,
        title: d.title.trim(),
        description: d.description.trim(),
        steps: d.steps.map((s) => s.text.trim()).filter(Boolean),
        ingredients,
        checked: (original?.checked ?? []).filter((c) => ingredients.some((i) => i.id === c)),
        categoryIds: d.categoryIds,
        prepMinutes: toNum(d.prep),
        cookMinutes: toNum(d.cook),
        servings: toNum(d.servings),
        imageIds: d.images.map((i) => i.id),
        photoCredits: creditsOf(d.images),
        sourceUrl: safeHttpUrl(d.sourceUrl),
        aiGenerated: d.aiGenerated || undefined,
        aiEdited: original?.aiEdited,
        isSample: original?.isSample,
        createdAt: original?.createdAt ?? now,
        updatedAt: now,
      }
      await recipeStore.saveRecipe(recipe, {
        add: d.images
          .filter((i) => !originalIds.has(i.id))
          .map((i) => ({ id: i.id, recipeId, createdAt: now, blob: i.blob })),
        removeIds: [...originalIds].filter((iid) => !currentIds.has(iid)),
      })
      await refresh()
      navigate(`/recipes/${recipeId}`, { replace: true }) // Back from the saved recipe must not land on the editor again
    } catch (err) {
      setSaveError(errorMessage(err))
      setSaving(false)
    }
  }

  function addIngredient() {
    const ing = { id: newId(), name: '' }
    setFocusId(ing.id)
    update({ ingredients: [...d.ingredients, ing] })
  }

  function addStep() {
    const s = { id: newId(), text: '' }
    setFocusId(s.id)
    update({ steps: [...d.steps, s] })
  }

  return (
    <form className="stack" onSubmit={save} noValidate>
      <Link to={isNew ? '/' : `/recipes/${id}`} className="back">
        <CaretLeft aria-hidden="true" weight="bold" />
        Cancel
      </Link>
      <h1 className="h1">{isNew ? 'New recipe' : 'Edit recipe'}</h1>
      {isNew && prefill && (
        <p className="notice notice--warn" role="note">
          {prefill.aiGenerated ? (
            <>
              <strong>Written by the AI and not tested: review before saving.</strong> Check quantities, cooking times
              and food-safety temperatures.
            </>
          ) : (
            <>
              <strong>Imported from a link: review before saving.</strong> The text was extracted automatically and can
              contain mistakes. Check quantities and steps against the original video.
            </>
          )}
        </p>
      )}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          className="input"
          value={d.title}
          onChange={(e) => update({ title: e.target.value })}
          aria-required="true"
          aria-invalid={saveError === undefined ? undefined : titleMissing}
          autoFocus={isNew}
          placeholder="e.g. Lemon pound cake"
        />
      </div>

      <div className="field">
        <label htmlFor="desc">Description / notes</label>
        <textarea
          id="desc"
          className="input"
          rows={3}
          value={d.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="source">Source link (optional)</label>
        <input
          id="source"
          className="input"
          type="url"
          inputMode="url"
          value={d.sourceUrl}
          onChange={(e) => update({ sourceUrl: e.target.value })}
          placeholder="https://…"
        />
      </div>

      <div className="triple">
        <div className="field">
          <label htmlFor="prep">Prep (min)</label>
          <input id="prep" className="input" type="number" inputMode="numeric" min="0" value={d.prep} onChange={(e) => update({ prep: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="cook">Cook (min)</label>
          <input id="cook" className="input" type="number" inputMode="numeric" min="0" value={d.cook} onChange={(e) => update({ cook: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="serv">Servings</label>
          <input id="serv" className="input" type="number" inputMode="numeric" min="0" value={d.servings} onChange={(e) => update({ servings: e.target.value })} />
        </div>
      </div>

      <fieldset className="fieldset">
        <legend>Categories</legend>
        {categories.length === 0 ? (
          <p className="muted">
            No categories yet. <Link to="/categories">Create one</Link>.
          </p>
        ) : (
          <div className="chips">
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                category={c}
                selected={d.categoryIds.includes(c.id)}
                onClick={() =>
                  update({
                    categoryIds: d.categoryIds.includes(c.id)
                      ? d.categoryIds.filter((x) => x !== c.id)
                      : [...d.categoryIds, c.id],
                  })
                }
              />
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend>Photos</legend>
        <ImagePicker items={d.images} onChange={(images) => update({ images })} title={d.title} />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Ingredients</legend>
        <ul className="edit-list">
          {d.ingredients.map((ing, i) => (
            <li key={ing.id} className="edit-row edit-row--ing">
              <input
                className="input"
                aria-label={`Ingredient ${i + 1} quantity`}
                placeholder="Qty"
                value={ing.quantity ?? ''}
                onChange={(e) =>
                  update({ ingredients: d.ingredients.map((x) => (x.id === ing.id ? { ...x, quantity: e.target.value } : x)) })
                }
              />
              <input
                className="input"
                aria-label={`Ingredient ${i + 1} name`}
                placeholder="Ingredient"
                value={ing.name}
                autoFocus={focusId === ing.id}
                onChange={(e) =>
                  update({ ingredients: d.ingredients.map((x) => (x.id === ing.id ? { ...x, name: e.target.value } : x)) })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addIngredient()
                  }
                }}
              />
              <button
                type="button"
                className="btn btn--icon"
                aria-label={`Remove ingredient ${i + 1}`}
                onClick={() => update({ ingredients: d.ingredients.filter((x) => x.id !== ing.id) })}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn" onClick={addIngredient}>
          + Add ingredient
        </button>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Instructions</legend>
        <ol className="edit-list">
          {d.steps.map((s, i) => (
            <li key={s.id} className="edit-row edit-row--step">
              <span className="step-no mono" aria-hidden="true">
                {i + 1}
              </span>
              <textarea
                className="input"
                rows={2}
                aria-label={`Step ${i + 1}`}
                value={s.text}
                autoFocus={focusId === s.id}
                onChange={(e) => update({ steps: d.steps.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)) })}
              />
              <div className="step-actions">
                <button type="button" className="btn btn--icon" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => update({ steps: move(d.steps, i, i - 1) })}>
                  ↑
                </button>
                <button type="button" className="btn btn--icon" aria-label={`Move step ${i + 1} down`} disabled={i === d.steps.length - 1} onClick={() => update({ steps: move(d.steps, i, i + 1) })}>
                  ↓
                </button>
                <button type="button" className="btn btn--icon" aria-label={`Remove step ${i + 1}`} onClick={() => update({ steps: d.steps.filter((x) => x.id !== s.id) })}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn" onClick={addStep}>
          + Add step
        </button>
      </fieldset>

      {saveError && (
        <p className="error" role="alert">
          Could not save: {saveError}
        </p>
      )}
      {titleMissing && saveError === undefined && <p className="muted">A title is required to save.</p>}
      <div className="row actions-bar">
        <button type="submit" className="btn btn--primary" disabled={saving || titleMissing}>
          {saving ? 'Saving…' : 'Save recipe'}
        </button>
        <Link to={isNew ? '/' : `/recipes/${id}`} className="btn btn--ghost">
          Cancel
        </Link>
      </div>
    </form>
  )
}
