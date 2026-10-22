import type { Category } from '../types'
import { CategoryChip } from './CategoryChip'

interface Props {
  categories: Category[]
  selected: string[]
  onToggle: (id: string) => void
}

export function CategoryFilterBar({ categories, selected, onToggle }: Props) {
  if (categories.length === 0) return null
  return (
    <div className="chips" role="group" aria-label="Filter by category (shows recipes matching any selected)">
      {categories.map((c) => (
        <CategoryChip key={c.id} category={c} selected={selected.includes(c.id)} onClick={() => onToggle(c.id)} />
      ))}
    </div>
  )
}
