import { Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { CartLineItem } from './CartLineItem'
import { CartSummary } from './CartSummary'
import { Button } from '../ui/Button'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { lines, previewSubtotal } = useCart()

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-label="Cart"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-surface shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Your cart</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="text-ink-soft hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {lines.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-soft">Your cart is empty.</p>
          ) : (
            <div className="divide-y divide-border">
              {lines.map((line) => (
                <CartLineItem key={line.menuItemId} line={line} />
              ))}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="space-y-4 border-t border-border px-5 py-4">
            <CartSummary subtotal={previewSubtotal} />
            <Link to="/checkout" onClick={onClose}>
              <Button className="w-full justify-center">Checkout</Button>
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
