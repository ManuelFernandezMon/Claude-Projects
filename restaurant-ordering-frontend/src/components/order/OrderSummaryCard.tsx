import { formatCurrency } from '../../lib/currency'
import { StatusBadge } from '../ui/StatusBadge'
import type { CreatedOrder } from '../../types/api'

export function OrderSummaryCard({ order }: { order: CreatedOrder }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-3 border-b border-dashed border-border pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">Order</p>
          <p className="font-mono text-sm text-ink">{order.id}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="divide-y divide-border">
        {order.items.map((item) => (
          <div key={item.menu_item_id} className="flex items-center justify-between py-3 text-sm">
            <span className="text-ink-soft">
              <span className="tabular-nums">{item.quantity}×</span>{' '}
              <span className="font-mono text-xs text-ink-soft">{item.menu_item_id}</span>
            </span>
            <span className="font-semibold text-ink tabular-nums">
              {formatCurrency(item.subtotal)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-border pt-4">
        <span className="font-display text-base font-semibold text-ink">Total</span>
        <span className="font-display text-lg font-semibold text-ember tabular-nums">
          {formatCurrency(order.total_amount)}
        </span>
      </div>

      <p className="mt-4 text-xs text-ink-soft">
        Placed by {order.customer_name} on {new Date(order.created_at).toLocaleString()}
      </p>
    </div>
  )
}
