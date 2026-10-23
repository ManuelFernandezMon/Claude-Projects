export type SortKey = 'newest' | 'az'

interface Props {
  value: SortKey
  onChange: (v: SortKey) => void
}

export function SortSelect({ value, onChange }: Props) {
  return (
    <div className="field">
      <label htmlFor="sort" className="sr-only">
        Sort recipes
      </label>
      <select id="sort" className="input" value={value} onChange={(e) => onChange(e.target.value as SortKey)}>
        <option value="newest">Newest</option>
        <option value="az">A to Z</option>
      </select>
    </div>
  )
}
