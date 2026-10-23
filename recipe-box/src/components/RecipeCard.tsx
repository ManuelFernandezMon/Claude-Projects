import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Category, Recipe } from '../types'
import { useImageUrl } from '../hooks/useImageUrl'
import { formatMinutes } from '../lib/format'
import { useLongPress } from '../hooks/useLongPress'
import { CategoryChip } from './CategoryChip'

interface Props {
  recipe: Recipe
  categories: Category[]
  /** Called when the card is pressed and held (or right-clicked); opens the actions sheet. */
  onMenu?: (recipe: Recipe) => void
}

export function RecipeCard({ recipe, categories, onMenu }: Props) {
  const press = useLongPress(() => onMenu?.(recipe))
  const cover = useImageUrl(recipe.imageIds[0])
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)
  const meta = [total ? formatMinutes(total) : '', recipe.servings ? `${recipe.servings} servings` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="card">
      <Link to={`/recipes/${recipe.id}`} className="card__link" draggable={false} {...(onMenu ? press : {})}>
        <div className="card__media" style={categories[0] ? ({ '--tint': categories[0].color } as CSSProperties) : undefined}>
          {cover ? (
            <img src={cover} alt="" loading="lazy" />
          ) : (
            <span className="card__placeholder" aria-hidden="true">
              {recipe.title.trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
          {recipe.isSample && <span className="badge">SAMPLE</span>}
        </div>
        <div className="card__body">
          <h2 className="card__title">{recipe.title}</h2>
          {meta && <p className="muted card__meta">{meta}</p>}
          {categories.length > 0 && (
            <div className="chips chips--tight">
              {categories.map((c) => (
                <CategoryChip key={c.id} category={c} small />
              ))}
            </div>
          )}
        </div>
      </Link>
    </li>
  )
}
