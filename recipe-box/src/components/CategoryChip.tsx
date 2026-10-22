import type { Category } from '../types'

interface Props {
  category: Category
  selected?: boolean
  onClick?: () => void
  small?: boolean
}

export function CategoryChip({ category, selected, onClick, small }: Props) {
  const cls = `chip${small ? ' chip--small' : ''}${selected ? ' chip--on' : ''}`
  const content = (
    <>
      <span className="chip__dot" style={{ background: category.color }} aria-hidden="true" />
      {category.name}
    </>
  )
  if (!onClick) {
    return <span className={cls}>{content}</span>
  }
  return (
    <button type="button" className={cls} aria-pressed={!!selected} onClick={onClick}>
      {content}
    </button>
  )
}
