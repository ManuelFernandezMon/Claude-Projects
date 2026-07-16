import { Button } from '../ui/Button'
import type { Pagination } from '../../types/api'

interface MenuPagerProps {
  pagination: Pagination
  onPageChange: (page: number) => void
}

export function MenuPager({ pagination, onPageChange }: MenuPagerProps) {
  if (pagination.total_pages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      <Button
        variant="secondary"
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-ink-soft tabular-nums">
        Page {pagination.page} of {pagination.total_pages}
      </span>
      <Button
        variant="secondary"
        disabled={pagination.page >= pagination.total_pages}
        onClick={() => onPageChange(pagination.page + 1)}
      >
        Next
      </Button>
    </div>
  )
}
