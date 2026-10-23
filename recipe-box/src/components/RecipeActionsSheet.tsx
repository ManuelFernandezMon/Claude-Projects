import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useNavigate } from '../lib/nav'
import { BookOpenText, Copy, ListChecks, PencilSimple, ShareNetwork, Sparkle, Trash } from '@phosphor-icons/react'
import { useData } from '../hooks/useData'
import { currentGesture } from '../hooks/useLongPress'
import { useImageUrl } from '../hooks/useImageUrl'
import { duplicateRecipe } from '../lib/duplicate'
import { errorMessage, formatMinutes } from '../lib/format'
import { ingredientsToText, recipeToText } from '../lib/recipeText'
import { copyText, shareText } from '../lib/share'
import { toast } from '../lib/toast'
import { isNativeApp } from '../lib/apiBase'
import { recipeStore } from '../storage/recipeStore'
import type { Recipe } from '../types'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  /** The recipe the sheet is about; null keeps it closed. */
  recipe: Recipe | null
  onClose: () => void
  /** Hide "Open" when the sheet is shown from the recipe's own page. */
  showOpen?: boolean
}

export function RecipeActionsSheet({ recipe, onClose, showOpen = true }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const openGesture = useRef(-1)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { refresh } = useData()
  const [confirming, setConfirming] = useState(false)
  const cover = useImageUrl(recipe?.imageIds[0])
  const open = recipe !== null && !confirming

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      openGesture.current = currentGesture()
      d.showModal()
      d.querySelector('button')?.focus() // start on the first action for keyboard and screen-reader users
    }
    if (!open && d.open) d.close()
  }, [open])

  const total = recipe ? (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) : 0
  const meta = recipe
    ? [total ? formatMinutes(total) : '', recipe.servings ? `${recipe.servings} servings` : ''].filter(Boolean).join(' · ')
    : ''

  /** Runs an action, then closes the sheet and reports the outcome in a toast. */
  async function run(action: () => Promise<string | undefined>) {
    try {
      const message = await action()
      if (message) toast(message)
    } catch (e) {
      toast(`Could not do that: ${errorMessage(e)}`)
    }
    onClose()
  }

  async function remove() {
    if (!recipe) return
    const r = recipe
    setConfirming(false)
    await run(async () => {
      await recipeStore.deleteRecipe(r.id)
      await refresh()
      if (pathname.includes(r.id)) navigate('/')
      return 'Recipe deleted'
    })
  }

  const items: { key: string; label: string; icon: ReactNode; danger?: boolean; onSelect: () => void }[] = []
  if (recipe) {
    const r = recipe
    if (showOpen) {
      items.push({ key: 'open', label: 'Open', icon: <BookOpenText />, onSelect: () => { onClose(); navigate(`/recipes/${r.id}`) } })
    }
    items.push(
      { key: 'edit', label: 'Edit', icon: <PencilSimple />, onSelect: () => { onClose(); navigate(`/recipes/${r.id}/edit`) } },
      { key: 'ai', label: 'Edit with AI', icon: <Sparkle />, onSelect: () => { onClose(); navigate(`/recipes/${r.id}/ai`) } },
      {
        key: 'duplicate',
        label: 'Duplicate',
        icon: <Copy />,
        onSelect: () =>
          void run(async () => {
            await duplicateRecipe(r)
            await refresh()
            return 'Duplicated. The copy is at the top.'
          }),
      },
      {
        key: 'share',
        label: 'Share recipe',
        icon: <ShareNetwork />,
        onSelect: () =>
          void run(async () => {
            const result = await shareText(r.title, recipeToText(r))
            return result === 'copied' ? 'Recipe copied to the clipboard' : undefined
          }),
      },
      {
        key: 'copy',
        label: 'Copy ingredients',
        icon: <ListChecks />,
        onSelect: () =>
          void run(async () => {
            if (r.ingredients.length === 0) return 'This recipe has no ingredients'
            await copyText(ingredientsToText(r))
            return `Copied ${r.ingredients.length} ingredient${r.ingredients.length > 1 ? 's' : ''}`
          }),
      },
      { key: 'delete', label: 'Delete', icon: <Trash />, danger: true, onSelect: () => setConfirming(true) },
    )
  }

  return (
    <>
      <dialog
        ref={ref}
        className="sheet"
        aria-labelledby="sheet-title"
        onClose={() => {
          if (open) onClose() // closed with Esc
        }}
        // The finger that was holding the card is still down when the sheet appears. Lifting it sends a click to
        // whatever is now under it (an action or the backdrop). That click belongs to the press that opened the sheet,
        // so it is ignored; any later tap is a new press, and keyboard activation (detail 0) is never a pointer click.
        onClickCapture={(e) => {
          if (e.detail > 0 && currentGesture() === openGesture.current) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        onClick={(e) => {
          if (e.target === ref.current) onClose() // tap on the dimmed area
        }}
      >
        <div className="sheet__grip" aria-hidden="true" />
        <div className="sheet__head">
          <div className="sheet__thumb" aria-hidden="true">
            {cover ? <img src={cover} alt="" /> : <span>{recipe?.title.trim().charAt(0).toUpperCase()}</span>}
          </div>
          <div className="sheet__title">
            <h2 id="sheet-title">{recipe?.title}</h2>
            {meta && <p className="muted small">{meta}</p>}
          </div>
        </div>
        <ul className="sheet__list">
          {items.map((it) => (
            <li key={it.key}>
              <button
                type="button"
                className={`sheet__item${it.danger ? ' sheet__item--danger' : ''}`}
                onClick={it.onSelect}
              >
                <span className="sheet__icon" aria-hidden="true">
                  {it.icon}
                </span>
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      </dialog>

      <ConfirmDialog
        open={confirming && recipe !== null}
        title="Delete this recipe?"
        confirmLabel="Delete"
        danger
        onConfirm={() => void remove()}
        onCancel={() => {
          setConfirming(false)
          onClose()
        }}
      >
        <p>
          “{recipe?.title}” and its photos will be permanently removed from {isNativeApp() ? 'this phone' : 'this browser'}.
          This can’t be undone unless you have a backup.
        </p>
      </ConfirmDialog>
    </>
  )
}
