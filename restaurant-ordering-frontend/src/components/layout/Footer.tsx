import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-xs text-ink-soft sm:flex-row sm:justify-between sm:px-6">
        <p>Ember &amp; Herb — online ordering, built as a proof of concept.</p>
        <Link to="/staff/orders" className="hover:text-ink hover:underline">
          Staff: update order status
        </Link>
      </div>
    </footer>
  )
}
