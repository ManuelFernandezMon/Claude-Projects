import { formatCurrency } from '../../lib/currency'

export function CartSummary({ subtotal }: { subtotal: number }) {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-soft">Estimated total</span>
        <span className="font-display text-lg font-semibold text-ink tabular-nums">
          {formatCurrency(subtotal)}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        Final total is confirmed by the kitchen at checkout — prices can change between now and
        when your order is placed.
      </p>
    </div>
  )
}
