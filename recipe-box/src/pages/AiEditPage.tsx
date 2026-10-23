import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CaretLeft, Sparkle } from '@phosphor-icons/react'
import { useParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { EmptyState } from '../components/EmptyState'
import { PasscodeField } from '../components/PasscodeField'
import { Spinner } from '../components/Spinner'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePasscode } from '../hooks/usePasscode'
import { applyProposal, diffRecipes, proposeEdit, saveReplacement, toImported, type DiffLine } from '../lib/aiEdit'
import { duplicateRecipe } from '../lib/duplicate'
import { errorMessage } from '../lib/format'
import { ImportError } from '../lib/importApi'
import { toast } from '../lib/toast'
import { recipeStore } from '../storage/recipeStore'
import type { ImportedRecipe, Recipe } from '../types'

const MAX_INSTRUCTION = 500
const EXAMPLES = ['Make it vegan', 'Halve the recipe', 'Double it for 8 people', 'Swap the butter for olive oil', 'Make it gluten-free', 'Simplify the steps']

const TAG: Record<DiffLine['kind'], string> = { same: '', added: 'New', changed: 'Changed', removed: 'Removed' }

function Lines({ lines }: { lines: DiffLine[] }) {
  return (
    <ul className="diff">
      {lines.map((l, i) => (
        <li key={i} className={`diff__line diff__line--${l.kind}`}>
          {l.kind !== 'same' && <span className="diff__tag">{TAG[l.kind]}</span>}
          <span className="diff__text">{l.text}</span>
          {l.kind === 'changed' && l.was && <span className="diff__was muted small">was: {l.was}</span>}
        </li>
      ))}
    </ul>
  )
}

export function AiEditPage() {
  useDocumentTitle('Edit with AI')
  const { id } = useParams()
  const navigate = useNavigate()
  const { refresh } = useData()
  const pc = usePasscode()
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined) // undefined = loading, null = missing
  const [loadError, setLoadError] = useState<string>()
  const [instruction, setInstruction] = useState('')
  const [proposal, setProposal] = useState<ImportedRecipe | null>(null)
  const [asked, setAsked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const proposalHeading = useRef<HTMLHeadingElement>(null)

  // A new proposal appears below the form, often off screen on a phone: bring it into view and announce it.
  useEffect(() => {
    if (proposal) proposalHeading.current?.focus()
  }, [proposal])

  useEffect(() => {
    let cancelled = false
    recipeStore
      .getRecipe(id ?? '')
      .then((r) => !cancelled && setRecipe(r ?? null))
      .catch((e) => !cancelled && setLoadError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [id])

  const diff = useMemo(() => (recipe && proposal ? diffRecipes(recipe, proposal) : null), [recipe, proposal])

  if (loadError) return <EmptyState title="Could not open this recipe">{loadError}</EmptyState>
  if (recipe === undefined) return <Spinner label="Opening the recipe…" />
  if (recipe === null) {
    return (
      <EmptyState
        title="Recipe not found"
        action={
          <Link to="/" className="btn">
            Back to recipes
          </Link>
        }
      />
    )
  }
  const original = recipe

  async function propose(e: FormEvent) {
    e.preventDefault()
    if (instruction.trim().length < 3 || busy) return
    setBusy(true)
    setError(undefined)
    try {
      // The first request edits the saved recipe; follow-ups refine the current proposal.
      const r = await proposeEdit(proposal ?? toImported(original), instruction, pc.passcode)
      if (!r) {
        setError('That does not look like a change to this recipe. Say what you want changed, for example “make it vegan”.')
        return
      }
      pc.remember()
      setProposal(r)
      setAsked((a) => [...a, instruction.trim()])
      setInstruction('')
    } catch (err) {
      if (err instanceof ImportError && err.code === 'unauthorized') pc.forget()
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function replace() {
    if (!proposal) return
    setSaving(true)
    setError(undefined)
    try {
      await saveReplacement(original, proposal)
      await refresh()
      toast('Recipe updated')
      navigate(`/recipes/${original.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  async function saveCopy() {
    if (!proposal) return
    setSaving(true)
    setError(undefined)
    try {
      const copy = await duplicateRecipe(original)
      const edited = applyProposal(copy, proposal)
      if (edited.title.trim().toLowerCase() === original.title.trim().toLowerCase()) edited.title = `${original.title} (edited)`
      await recipeStore.saveRecipe(edited)
      await refresh()
      toast('Saved as a new recipe')
      navigate(`/recipes/${copy.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <Link to={`/recipes/${original.id}`} className="back">
        <CaretLeft aria-hidden="true" weight="bold" />
        {original.title}
      </Link>
      <h1 className="h1">Edit with AI</h1>
      <p className="muted">
        Say what to change. You will see exactly what the AI would change before anything is saved. Your photos, categories
        and source link are never sent to the AI or changed by it.
      </p>

      <form className="stack" onSubmit={(e) => void propose(e)} noValidate>
        <div className="field">
          <label htmlFor="ai-instruction">{proposal ? 'Adjust further' : 'What should change?'}</label>
          <textarea
            id="ai-instruction"
            className="input"
            rows={3}
            maxLength={MAX_INSTRUCTION}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. make it vegan, or halve the sugar"
          />
        </div>
        {!proposal && (
          <div className="examples" aria-label="Examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="chip example" onClick={() => setInstruction(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
        <PasscodeField value={pc.passcode} onChange={pc.setPasscode} editing={pc.editing} onEdit={() => pc.setEditing(true)} />
        <div className="row">
          <button type="submit" className="btn btn--primary" disabled={busy || saving || instruction.trim().length < 3 || !pc.passcode}>
            <Sparkle aria-hidden="true" />
            {busy ? 'Working…' : proposal ? 'Update proposal' : 'Propose changes'}
          </button>
          {busy && (
            <span className="muted" role="status">
              Usually a few seconds. If Gemini is busy it keeps trying other models, up to two minutes.
            </span>
          )}
        </div>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {proposal && diff && (
        <section className="panel stack stack--tight" aria-labelledby="proposal-h">
          <h2 id="proposal-h" className="h2" ref={proposalHeading} tabIndex={-1}>
            Proposed changes
          </h2>
          {asked.length > 0 && <p className="muted small">You asked: {asked.map((a) => `“${a}”`).join(', then ')}</p>}

          {diff.changes === 0 ? (
            <p>The AI did not change anything. Try describing the change differently.</p>
          ) : (
            <p className="muted small">
              {diff.changes} change{diff.changes > 1 ? 's' : ''}. Lines marked New, Changed or Removed are the only differences.
            </p>
          )}

          {diff.title && (
            <div>
              <h3 className="h3">Title</h3>
              <p>
                <span className="diff__tag">Changed</span> {diff.title.to} <span className="muted small">was: {diff.title.from}</span>
              </p>
            </div>
          )}
          {diff.facts.length > 0 && (
            <div>
              <h3 className="h3">Details</h3>
              <ul className="diff">
                {diff.facts.map((f) => (
                  <li key={f.label} className="diff__line diff__line--changed">
                    <span className="diff__tag">Changed</span>
                    <span className="diff__text">
                      {f.label}: {f.to}
                    </span>
                    <span className="diff__was muted small">was: {f.from}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {diff.description && (
            <div>
              <h3 className="h3">Notes</h3>
              <p>
                <span className="diff__tag">Changed</span> {proposal.description}
              </p>
            </div>
          )}
          <div>
            <h3 className="h3">Ingredients</h3>
            <Lines lines={diff.ingredients} />
          </div>
          <div>
            <h3 className="h3">Instructions</h3>
            <Lines lines={diff.steps} />
          </div>

          <p className="notice notice--warn small" role="note">
            Changed by an AI and <strong>not tested</strong>. Check quantities, times and food-safety temperatures before
            cooking, especially with allergies.
          </p>

          <div className="row">
            <button type="button" className="btn btn--primary" onClick={() => void replace()} disabled={saving || busy || diff.changes === 0}>
              {saving ? 'Saving…' : 'Replace this recipe'}
            </button>
            <button type="button" className="btn" onClick={() => void saveCopy()} disabled={saving || busy || diff.changes === 0}>
              Save as a copy
            </button>
            <Link to={`/recipes/${original.id}`} className="btn btn--ghost">
              Discard
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
