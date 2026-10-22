interface Props {
  value: string
  onChange: (v: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="field field--grow">
      <label htmlFor="search" className="sr-only">
        Search recipes by title or ingredient
      </label>
      <input
        id="search"
        type="search"
        className="input"
        placeholder="Search title or ingredient…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  )
}
