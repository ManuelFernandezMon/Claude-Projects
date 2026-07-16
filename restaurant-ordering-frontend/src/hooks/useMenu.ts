import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMenu } from '../lib/api'
import { ApiError, ERROR_MESSAGES } from '../lib/errors'
import type { MenuItem, Pagination } from '../types/api'

type Status = 'loading' | 'error' | 'success'

const PAGE_LIMIT = 50

export function useMenu() {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<MenuItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [seenCategories, setSeenCategories] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchPage = useCallback(async (pageToFetch: number) => {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const data = await getMenu(pageToFetch, PAGE_LIMIT)
      setItems(data.items)
      setPagination(data.pagination)
      setSeenCategories((prev) => {
        const next = new Set(prev)
        for (const item of data.items) next.add(item.category)
        return Array.from(next).sort()
      })
      setStatus('success')
    } catch (err) {
      const message = err instanceof ApiError ? ERROR_MESSAGES[err.code] : ERROR_MESSAGES.NETWORK_ERROR
      setErrorMessage(message)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void fetchPage(page)
  }, [page, fetchPage])

  const categories = useMemo(() => ['All', ...seenCategories], [seenCategories])

  return {
    items,
    pagination,
    categories,
    status,
    errorMessage,
    page,
    setPage,
    refetch: () => fetchPage(page),
  }
}
