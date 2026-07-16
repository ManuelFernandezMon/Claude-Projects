import { Button } from './Button'

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-status-cancelled/30 bg-status-cancelled-bg px-4 py-3 text-sm text-status-cancelled sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="shrink-0">
          Try again
        </Button>
      )}
    </div>
  )
}
