import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ImportedRecipe } from '../types'
import { PasscodeField } from '../components/PasscodeField'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePasscode } from '../hooks/usePasscode'
import { ImportError, generateRecipe } from '../lib/importApi'
import { formatMinutes } from '../lib/format'
import { toPrefill } from '../lib/prefill'

const MAX_PROMPT = 1000
const EXAMPLES = [
  'A quick weeknight dinner with chicken and rice, 4 servings',
  'A vegan chocolate dessert that needs no oven',
  'A salty snack for movie night, ready in 20 minutes',
]

export function GeneratePage() {
  useDocumentTitle('Ask AI')
  const navigate = useNavigate()
  const { categories } = useData()
  const pc = usePasscode()
  const [prompt, setPrompt] = useState('')
  const [change, setChange] = useState('')
  const [recipe, setRecipe] = useState<ImportedRecipe | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function run(text: string, previous?: ImportedRecipe) {
    setBusy(true)
    setError(undefined)
    try {
      const r = await generateRecipe(
        { prompt: text.trim(), previous, categories: categories.map((c) => c.name) },
        pc.passcode,
      )
      if (!r) {
        setError('That does not look like a cooking request. Describe a dish, ingredients or a meal you want.')
        return
      }
      pc.remember()
      setRecipe(r)
      setChange('')
    } catch (err) {
      if (err instanceof ImportError && err.code === 'unauthorized') pc.forget()
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function onGenerate(e: FormEvent) {
    e.preventDefault()
    if (prompt.trim().length >= 3 && !busy) void run(prompt)
  }

  function onRefine(e: FormEvent) {
    e.preventDefault()
    if (recipe && change.trim().length >= 3 && !busy) void run(change, recipe)
  }

  const time = [
    recipe?.prepMinutes ? `Prep ${formatMinutes(recipe.prepMinutes)}` : '',
    recipe?.cookMinutes ? `Cook ${formatMinutes(recipe.cookMinutes)}` : '',
    recipe?.servings ? `Serves ${recipe.servings}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="stack">
      <Link to="/" className="back">
        ← Recipes
      </Link>
      <h1 className="h1">Ask AI for a recipe</h1>

      <form className="stack" onSubmit={onGenerate} noValidate>
        <div className="field">
          <label htmlFor="ai-prompt">{recipe ? 'Your original request' : 'What do you want to cook?'}</label>
          <textarea
            id="ai-prompt"
            className="input"
            rows={4}
            value={prompt}
            maxLength={MAX_PROMPT}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A gluten-free banana bread with walnuts, for 8 people"
          />
        </div>
        {!recipe && (
          <div className="examples" aria-label="Examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="chip example" onClick={() => setPrompt(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
        <PasscodeField value={pc.passcode} onChange={pc.setPasscode} editing={pc.editing} onEdit={() => pc.setEditing(true)} />
        <div className="row">
          <button type="submit" className="btn btn--primary" disabled={busy || prompt.trim().length < 3 || !pc.passcode}>
            {busy && !recipe ? 'Writing your recipe…' : recipe ? 'Start over with this request' : 'Create recipe'}
          </button>
          {busy && (
            <span className="muted" role="status">
              This can take up to a minute.
            </span>
          )}
        </div>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {recipe && (
        <section className="panel stack stack--tight" aria-labelledby="ai-result">
          <h2 id="ai-result" className="h1">
            {recipe.title}
          </h2>
          {time && <p className="muted">{time}</p>}
          {recipe.description && <p className="prose">{recipe.description}</p>}
          <h3 className="h2">Ingredients</h3>
          <ul className="preview-list">
            {recipe.ingredients.map((i, idx) => (
              <li key={idx}>
                {i.quantity && <span className="preview-qty">{i.quantity} </span>}
                {i.name}
              </li>
            ))}
          </ul>
          <h3 className="h2">Instructions</h3>
          <ol className="steps">
            {recipe.steps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
          <p className="notice notice--warn small" role="note">
            Written by an AI and <strong>not tested</strong>. Check quantities, times and food-safety temperatures
            before cooking, especially with allergies.
          </p>

          <form className="stack stack--tight" onSubmit={onRefine} noValidate>
            <div className="field">
              <label htmlFor="ai-change">Ask for changes</label>
              <input
                id="ai-change"
                className="input"
                value={change}
                maxLength={500}
                onChange={(e) => setChange(e.target.value)}
                placeholder="e.g. make it vegan, or halve the sugar"
              />
            </div>
            <div className="row">
              <button type="submit" className="btn" disabled={busy || change.trim().length < 3}>
                {busy ? 'Updating…' : 'Update recipe'}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={() =>
                  navigate('/recipes/new', { state: { prefill: toPrefill(recipe, categories, { aiGenerated: true }) } })
                }
              >
                Edit and save
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
