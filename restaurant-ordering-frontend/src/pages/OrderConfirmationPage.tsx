import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { OrderSummaryCard } from '../components/order/OrderSummaryCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'

export function OrderConfirmationPage() {
  const { lastOrder } = useCart()

  if (!lastOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          title="No recent order found"
          description="Once you place an order, its confirmation will show up here."
          action={
            <Link to="/">
              <Button className="mt-2">Browse the menu</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-ink">Order placed</h1>
      <p className="mt-2 text-ink-soft">
        Thanks, {lastOrder.customer_name} — we've got it. Keep this order ID handy if you need to
        check on its status.
      </p>
      <div className="mt-6">
        <OrderSummaryCard order={lastOrder} />
      </div>
      <Link to="/" className="mt-6 inline-block">
        <Button variant="secondary">Back to menu</Button>
      </Link>
    </div>
  )
}
