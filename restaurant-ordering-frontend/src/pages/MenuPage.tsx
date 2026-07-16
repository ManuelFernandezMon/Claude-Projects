import { useState } from 'react'
import { useMenu } from '../hooks/useMenu'
import { CategoryFilter } from '../components/menu/CategoryFilter'
import { MenuList } from '../components/menu/MenuList'
import { MenuPager } from '../components/menu/MenuPager'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'

export function MenuPage() {
  const { items, pagination, categories, status, errorMessage, setPage, refetch } = useMenu()
  const [activeCategory, setActiveCategory] = useState('All')

  const visibleItems =
    activeCategory === 'All' ? items : items.filter((item) => item.category === activeCategory)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Tonight's menu</h1>
        <p className="mt-2 text-ink-soft">
          Add dishes to your cart, then check out when you're ready. Totals shown here are
          estimates — the kitchen confirms the final price when your order is placed.
        </p>
      </div>

      {status === 'loading' && <Spinner label="Loading menu…" />}

      {status === 'error' && errorMessage && <ErrorBanner message={errorMessage} onRetry={refetch} />}

      {status === 'success' && (
        <div className="space-y-6">
          <CategoryFilter
            categories={categories}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
          <MenuList items={visibleItems} />
          {pagination && <MenuPager pagination={pagination} onPageChange={setPage} />}
        </div>
      )}
    </div>
  )
}
