import { StatusUpdateForm } from '../components/staff/StatusUpdateForm'

export function StaffStatusPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-ink">Update order status</h1>
      <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-soft">
        This tool updates one order's status by ID. There is no order lookup or listing in this
        API — you'll need the order ID from elsewhere (for example, the customer's confirmation
        screen). Updating here does not show item or customer details, only status and total.
      </div>
      <div className="mt-6">
        <StatusUpdateForm />
      </div>
    </div>
  )
}
