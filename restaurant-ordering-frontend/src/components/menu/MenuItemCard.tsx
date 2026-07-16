import { useState } from 'react'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import type { MenuItem } from '../../types/api'

export function MenuItemCard({ item }: { item: MenuItem }) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = () => {
    addItem(item, quantity)
    setQuantity(1)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1200)
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-ink">{item.name}</h3>
          <span className="shrink-0 font-display text-lg font-semibold text-ember tabular-nums">
            {formatCurrency(item.price)}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-1.5 text-ink-soft hover:text-ink"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-semibold tabular-nums">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            className="px-3 py-1.5 text-ink-soft hover:text-ink"
          >
            +
          </button>
        </div>
        <Button onClick={handleAdd} className="flex-1 justify-center">
          {justAdded ? 'Added ✓' : 'Add to cart'}
        </Button>
      </div>
    </div>
  )
}
