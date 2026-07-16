import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { CheckoutForm } from '../components/checkout/CheckoutForm'
import { CartSummary } from '../components/cart/CartSummary'
import { formatCurrency } from '../lib/currency'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'

export function CheckoutPage() {
  const { lines, previewSubtotal } = useCart()

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Your cart is empty"
          description="Add a few dishes from the menu before checking out."
          action={
            <Link to="/">
              <Button className="mt-2">Back to menu</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-ink">Checkout</h1>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Your order
          </h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface px-4">
            {lines.map((line) => (
              <div key={line.menuItemId} className="flex items-center justify-between py-3 text-sm">
                <span className="text-ink">
                  <span className="tabular-nums text-ink-soft">{line.quantity}×</span> {line.name}
                </span>
                <span className="font-semibold text-ink tabular-nums">
                  {formatCurrency(line.unitPrice * line.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-surface px-4 pb-4">
            <CartSummary subtotal={previewSubtotal} />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Your details
          </h2>
          <CheckoutForm />
        </div>
      </div>
    </div>
  )
}
