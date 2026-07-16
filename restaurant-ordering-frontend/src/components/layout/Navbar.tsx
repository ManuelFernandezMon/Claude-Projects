import { Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'

interface NavbarProps {
  onOpenCart: () => void
}

export function Navbar({ onOpenCart }: NavbarProps) {
  const { lines } = useCart()
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="font-display text-xl font-semibold text-ink">
          Ember <span className="text-ember">&amp;</span> Herb
        </Link>
        <button
          type="button"
          onClick={onOpenCart}
          className="relative inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ember"
        >
          Cart
          {itemCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1.5 text-xs font-bold text-white tabular-nums">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
