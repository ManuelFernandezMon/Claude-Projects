import { Link } from 'react-router-dom'
import { PawIcon } from '../components/layout/PawIcon'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-5 py-24 text-center">
      <PawIcon className="h-14 w-14 text-clinic-green/40" />
      <h1 className="font-heading mt-4 text-3xl font-bold text-clinic-ink">
        Page not found
      </h1>
      <p className="mt-2 text-clinic-ink-soft">
        We couldn't find that page — let's get you back on track.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-full bg-clinic-green px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
      >
        Back to Home
      </Link>
    </section>
  )
}
