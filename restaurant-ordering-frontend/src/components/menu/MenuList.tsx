import { MenuItemCard } from './MenuItemCard'
import { EmptyState } from '../ui/EmptyState'
import type { MenuItem } from '../../types/api'

export function MenuList({ items }: { items: MenuItem[] }) {
  const available = items.filter((item) => item.is_available)

  if (available.length === 0) {
    return (
      <EmptyState
        title="Nothing here right now"
        description="No dishes are available in this category at the moment."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {available.map((item) => (
        <MenuItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
