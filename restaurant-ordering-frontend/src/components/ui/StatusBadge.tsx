import type { OrderStatus } from '../../types/api'

const labels: Record<OrderStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const classes: Record<OrderStatus, string> = {
  pending: 'bg-status-pending-bg text-status-pending',
  preparing: 'bg-status-preparing-bg text-status-preparing',
  completed: 'bg-status-completed-bg text-status-completed',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${classes[status]}`}
    >
      {labels[status]}
    </span>
  )
}
