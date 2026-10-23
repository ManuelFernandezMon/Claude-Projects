import { useEffect, useState } from 'react'
import { ArrowUpRight, CaretLeft } from '@phosphor-icons/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { recipeStore } from '../storage/recipeStore'
import type { Recipe } from '../types'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { CategoryChip } from '../components/CategoryChip'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { ImageGallery } from '../components/ImageGallery'
import { IngredientChecklist } from '../components/IngredientChecklist'
import { Spinner } from '../components/Spinner'
import { errorMessage, formatMinutes } from '../lib/format'
import { safeHttpUrl } from '../lib/url'

export function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { categories, refresh } = useData()
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined) // undefined=loading, null=missing
  const [error, setError] = useState<string>()
  const [confirmDelete, setConfirmDelete] = useState(false)
  useDocumentTitle(recipe?.title)

  useEffect(() => {
    let cancelled = false
    setRecipe(undefined)
    recipeStore
      .getRecipe(id ?? '')
      .then((r) => {
        if (!cancelled) setRecipe(r ?? null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) return <EmptyState title="Could not load recipe">{error}</EmptyState>
  if (recipe === undefined) return <Spinner />
  if (recipe === null) {
    return (
      <EmptyState
        title="Recipe not found"
        action={
          <Link to="/" className="btn">
            Back to recipes
          </Link>
        }
      >
        It may have been deleted.
      </EmptyState>
    )
  }

  const recipeCategories = categories.filter((c) => recipe.categoryIds.includes(c.id))
  const source = safeHttpUrl(recipe.sourceUrl)
  const facts: [string, string][] = []
  if (recipe.prepMinutes) facts.push(['Prep', formatMinutes(recipe.prepMinutes)])
  if (recipe.cookMinutes) facts.push(['Cook', formatMinutes(recipe.cookMinutes)])
  if (recipe.servings) facts.push(['Serves', String(recipe.servings)])

  async function remove() {
    setConfirmDelete(false)
    try {
      await recipeStore.deleteRecipe(recipe!.id)
      await refresh()
      navigate('/')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <article className="stack">
      <Link to="/" className="back">
        <CaretLeft aria-hidden="true" weight="bold" />
        Recipes
      </Link>
      <header className="stack stack--tight">
        <h1 className="h1">
          {recipe.title} {recipe.isSample && <span className="badge badge--inline">SAMPLE</span>}
        </h1>
        {recipeCategories.length > 0 && (
          <div className="chips">
            {recipeCategories.map((c) => (
              <CategoryChip key={c.id} category={c} />
            ))}
          </div>
        )}
        {facts.length > 0 && (
          <dl className="facts">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <ImageGallery imageIds={recipe.imageIds} title={recipe.title} />

      {recipe.aiGenerated && (
        <p className="notice notice--warn small" role="note">
          Written by the AI assistant and <strong>not tested</strong>. Double-check quantities, times and food-safety
          temperatures.
        </p>
      )}

      {source && (
        <p className="small">
          Source:{' '}
          <a href={source} target="_blank" rel="noopener noreferrer">
            {new URL(source).hostname.replace(/^www\./, '')}
            <ArrowUpRight aria-hidden="true" size={14} style={{ marginLeft: 4, verticalAlign: '-2px' }} />
          </a>
        </p>
      )}

      {recipe.description && <p className="prose">{recipe.description}</p>}

      <IngredientChecklist recipeId={recipe.id} ingredients={recipe.ingredients} initialChecked={recipe.checked} />

      <section aria-labelledby="steps-h">
        <h2 id="steps-h" className="h2">
          Instructions
        </h2>
        {recipe.steps.length === 0 ? (
          <p className="muted">No steps listed.</p>
        ) : (
          <ol className="steps">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
      </section>

      <div className="row">
        <Link to={`/recipes/${recipe.id}/edit`} className="btn btn--primary">
          Edit
        </Link>
        <button type="button" className="btn btn--danger-ghost" onClick={() => setConfirmDelete(true)}>
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this recipe?"
        confirmLabel="Delete"
        danger
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>
          “{recipe.title}” and its photos will be permanently removed from this browser. This can’t be undone unless you
          have a backup.
        </p>
      </ConfirmDialog>
    </article>
  )
}
