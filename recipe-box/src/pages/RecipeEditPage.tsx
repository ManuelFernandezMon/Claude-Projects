import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { recipeStore } from '../storage/recipeStore'
import type { Ingredient, Recipe } from '../types'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { CategoryChip } from '../components/CategoryChip'
import { EmptyState } from '../components/EmptyState'
import { ImagePicker, type ImageItem } from '../components/ImagePicker'
import { Spinner } from '../components/Spinner'
import { newId } from '../lib/id'
import { errorMessage } from '../lib/format'

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
}

const emptyDraft = (): Draft => ({
  title: '',
  description: '',
  prep: '',
  cook: '',
  servings: '',
  categoryIds: [],
  ingredients: [{ id: newId(), name: '' }],
  steps: [{ id: newId(), text: '' }],
  images: [],
})

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
  const { categories, refresh } = useData()
  const [original, setOriginal] = useState<Recipe>()
  const [draft, setDraft] = useState<Draft | undefined>(isNew ? emptyDraft() : undefined)
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
          images: r.imageIds.flatMap((iid, i) => (blobs[i] ? [{ id: iid, blob: blobs[i] }] : [])),
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
        .map((i) => ({ id: i.id, name: i.name.trim(), quantity: i.quantity?.trim() || undefined }))
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
      navigate(`/recipes/${recipeId}`)
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
        ← Cancel
      </Link>
      <h1 className="h1">{isNew ? 'New recipe' : 'Edit recipe'}</h1>

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
        <ImagePicker items={d.images} onChange={(images) => update({ images })} />
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
