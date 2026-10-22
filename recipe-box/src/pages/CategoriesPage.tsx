import { useState, type FormEvent } from 'react'
import { recipeStore } from '../storage/recipeStore'
import { CATEGORY_COLORS } from '../storage/seed'
import type { Category } from '../types'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { newId } from '../lib/id'
import { errorMessage } from '../lib/format'

function CategoryForm({
  initial,
  existing,
  onSave,
  onCancel,
}: {
  initial: Pick<Category, 'name' | 'color'>
  existing: Category[]
  onSave: (name: string, color: string) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState(initial.color)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Name is required.')
    if (existing.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError(`A category named “${trimmed}” already exists.`)
    }
    setBusy(true)
    try {
      await onSave(trimmed, color)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form className="cat-form stack stack--tight" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="cat-name">Name</label>
        <input id="cat-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <fieldset className="fieldset fieldset--bare">
        <legend>Color</legend>
        <div className="swatches">
          {CATEGORY_COLORS.map((c) => (
            <label key={c} className="swatch" style={{ background: c }}>
              <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} />
              <span className="sr-only">{c}</span>
            </label>
          ))}
          <label className="swatch swatch--custom">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom color" />
          </label>
        </div>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Save
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function CategoriesPage() {
  useDocumentTitle('Categories')
  const { categories, recipes, loading, refresh } = useData()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [error, setError] = useState<string>()

  if (loading) return <Spinner />

  const usage = (id: string) => recipes.filter((r) => r.categoryIds.includes(id)).length

  async function confirmDelete() {
    const cat = deleting
    setDeleting(null)
    if (!cat) return
    try {
      await recipeStore.deleteCategory(cat.id)
      await refresh()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1 className="h1">Categories</h1>
        {editing !== 'new' && (
          <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
            + New category
          </button>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {editing === 'new' && (
        <CategoryForm
          initial={{ name: '', color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length] }}
          existing={categories}
          onCancel={() => setEditing(null)}
          onSave={async (name, color) => {
            const order = categories.reduce((m, c) => Math.max(m, c.order), -1) + 1
            await recipeStore.saveCategory({ id: newId(), name, color, order })
            await refresh()
            setEditing(null)
          }}
        />
      )}

      {categories.length === 0 && editing !== 'new' ? (
        <EmptyState title="No categories">Create categories like Sweet, Salty or Drinks to organize recipes.</EmptyState>
      ) : (
        <ul className="cat-list">
          {categories.map((c) => (
            <li key={c.id} className="cat-item">
              {editing === c.id ? (
                <CategoryForm
                  initial={c}
                  existing={categories.filter((x) => x.id !== c.id)}
                  onCancel={() => setEditing(null)}
                  onSave={async (name, color) => {
                    await recipeStore.saveCategory({ ...c, name, color })
                    await refresh()
                    setEditing(null)
                  }}
                />
              ) : (
                <div className="cat-row">
                  <span className="chip__dot chip__dot--big" style={{ background: c.color }} aria-hidden="true" />
                  <div className="cat-row__name">
                    <strong>{c.name}</strong>
                    <span className="muted"> · {usage(c.id)} recipe{usage(c.id) === 1 ? '' : 's'}</span>
                  </div>
                  <button type="button" className="btn btn--small" onClick={() => setEditing(c.id)} aria-label={`Edit ${c.name}`}>
                    Edit
                  </button>
                  <button type="button" className="btn btn--small btn--danger-ghost" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name ?? ''}”?`}
        confirmLabel="Delete category"
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      >
        <p>
          The category is removed from {deleting ? usage(deleting.id) : 0} recipe(s). <strong>The recipes themselves are kept.</strong>
        </p>
      </ConfirmDialog>
    </div>
  )
}
