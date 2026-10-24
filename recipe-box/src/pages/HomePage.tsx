import { UpdateNotice } from '../components/UpdateNotice'
import { useMemo, useState } from 'react'
import { HandTap, LinkSimple, Sparkle, X } from '@phosphor-icons/react'
import { Link } from '../lib/nav'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { recipeStore } from '../storage/recipeStore'
import { CategoryFilterBar } from '../components/CategoryFilterBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { RecipeActionsSheet } from '../components/RecipeActionsSheet'
import { RecipeCard } from '../components/RecipeCard'
import { SearchBar } from '../components/SearchBar'
import { SortSelect, type SortKey } from '../components/SortSelect'
import { Spinner } from '../components/Spinner'
import { errorMessage } from '../lib/format'
import type { Recipe } from '../types'

const TIP_KEY = 'recipe-box:hold-tip'
function readTipSeen(): boolean {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return false
  }
}
function markTipSeen(): void {
  try {
    localStorage.setItem(TIP_KEY, '1')
  } catch {
    /* the tip simply shows again next time */
  }
}

export function HomePage() {
  useDocumentTitle()
  const { recipes, categories, loading, error, refresh } = useData()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [selected, setSelected] = useState<string[]>([])
  const [confirmSamples, setConfirmSamples] = useState(false)
  const [actionError, setActionError] = useState<string>()
  const [menuRecipe, setMenuRecipe] = useState<Recipe | null>(null)
  const [tipSeen, setTipSeen] = useState(readTipSeen)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = recipes.filter((r) => {
      if (selected.length && !r.categoryIds.some((id) => selected.includes(id))) return false
      if (!q) return true
      return r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q))
    })
    return list.sort((a, b) =>
      sort === 'az'
        ? a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        : b.createdAt - a.createdAt,
    )
  }, [recipes, query, selected, sort])

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const sampleCount = recipes.filter((r) => r.isSample).length
  const filtering = query.trim() !== '' || selected.length > 0

  if (loading) return <Spinner label="Opening your recipe box…" />
  if (error) {
    return (
      <EmptyState title="Could not open the database">
        {error}. If you are in a private window, IndexedDB may be unavailable.
      </EmptyState>
    )
  }

  async function deleteSamples() {
    setConfirmSamples(false)
    try {
      await recipeStore.deleteSampleRecipes()
      await refresh()
    } catch (e) {
      setActionError(errorMessage(e))
    }
  }

  return (
    <div className="stack">
      <UpdateNotice />

      <div className="page-head">
        <h1 className="h1">Recipes</h1>
        <span className="muted mono">
          {visible.length}
          {filtering ? ` of ${recipes.length}` : ''}
        </span>
      </div>

      <div className="row">
        <Link to="/ai" className="btn">
          <Sparkle aria-hidden="true" />
          Ask AI for a recipe
        </Link>
        <Link to="/import" className="btn">
          <LinkSimple aria-hidden="true" />
          Import link
        </Link>
      </div>

      {recipes.length > 0 && (
        <div className="toolbar">
          <SearchBar value={query} onChange={setQuery} />
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}
      <CategoryFilterBar
        categories={categories}
        selected={selected}
        onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
      />

      {sampleCount > 0 && (
        <p className="notice">
          {sampleCount} recipe{sampleCount > 1 ? 's are' : ' is a'} labeled <strong>SAMPLE</strong>.{' '}
          <button type="button" className="link-btn" onClick={() => setConfirmSamples(true)}>
            Delete sample recipes
          </button>
        </p>
      )}
      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}

      {recipes.length > 0 && !tipSeen && (
        <p className="tip small muted">
          <HandTap aria-hidden="true" />
          <span>Press and hold a recipe for quick actions.</span>
          <button
            type="button"
            className="tip__close"
            aria-label="Dismiss tip"
            onClick={() => {
              markTipSeen()
              setTipSeen(true)
            }}
          >
            <X aria-hidden="true" />
          </button>
        </p>
      )}

      {recipes.length === 0 ? (
        <EmptyState
          title="No recipes yet"
          action={
            <Link to="/recipes/new" className="btn btn--primary">
              Add your first recipe
            </Link>
          }
        >
          Everything you add is stored only in this browser.
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No matches"
          action={
            <button
              type="button"
              className="btn"
              onClick={() => {
                setQuery('')
                setSelected([])
              }}
            >
              Clear search and filters
            </button>
          }
        >
          Nothing matches your search or selected categories.
        </EmptyState>
      ) : (
        <ul className="grid">
          {visible.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              categories={r.categoryIds.flatMap((id) => categoryById.get(id) ?? [])}
              onMenu={(rec) => {
                setMenuRecipe(rec)
                markTipSeen()
                setTipSeen(true)
              }}
            />
          ))}
        </ul>
      )}

      <RecipeActionsSheet recipe={menuRecipe} onClose={() => setMenuRecipe(null)} />

      <ConfirmDialog
        open={confirmSamples}
        title="Delete sample recipes?"
        confirmLabel="Delete samples"
        danger
        onConfirm={() => void deleteSamples()}
        onCancel={() => setConfirmSamples(false)}
      >
        <p>Removes the {sampleCount} sample recipe(s). Your own recipes are not touched.</p>
      </ConfirmDialog>
    </div>
  )
}
