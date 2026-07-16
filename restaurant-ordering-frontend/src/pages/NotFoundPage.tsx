import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-ink-soft">That page doesn't exist.</p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Back to menu</Button>
      </Link>
    </div>
  )
}
