import { formatCurrency } from '../../lib/currency'
import { useCart } from '../../hooks/useCart'
import type { CartLine } from '../../context/cart-context'

export function CartLineItem({ line }: { line: CartLine }) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">{line.name}</p>
        <p className="text-xs text-ink-soft tabular-nums">
          {formatCurrency(line.unitPrice)} each
        </p>
        <button
          type="button"
          onClick={() => removeItem(line.menuItemId)}
          className="mt-1 text-xs text-status-cancelled hover:underline"
        >
          Remove
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            aria-label={`Decrease ${line.name} quantity`}
            onClick={() => updateQuantity(line.menuItemId, line.quantity - 1)}
            className="px-2.5 py-1 text-ink-soft hover:text-ink"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-semibold tabular-nums">
            {line.quantity}
          </span>
          <button
            type="button"
            aria-label={`Increase ${line.name} quantity`}
            onClick={() => updateQuantity(line.menuItemId, line.quantity + 1)}
            className="px-2.5 py-1 text-ink-soft hover:text-ink"
          >
            +
          </button>
        </div>
        <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
          {formatCurrency(line.unitPrice * line.quantity)}
        </span>
      </div>
    </div>
  )
}
