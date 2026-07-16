interface CategoryFilterProps {
  categories: string[]
  active: string
  onSelect: (category: string) => void
}

export function CategoryFilter({ categories, active, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => {
        const isActive = category === active
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-ember bg-ember text-white'
                : 'border-border bg-surface text-ink-soft hover:border-ember/50 hover:text-ink'
            }`}
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}
