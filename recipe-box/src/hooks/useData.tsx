import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onStoreSwapped, recipeStore } from '../storage/recipeStore'
import type { Category, Recipe } from '../types'
import { errorMessage } from '../lib/format'
import { DATA_CHANGED } from '../lib/events'
import { useAuth } from './useAuth'

interface DataState {
  recipes: Recipe[]
  categories: Category[]
  loading: boolean
  error?: string
  refresh: () => Promise<void>
}

const DataContext = createContext<DataState | null>(null)

function sortCategories(list: Category[]): Category[] {
  return [...list].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([recipeStore.listRecipes(), recipeStore.listCategories()])
      setRecipes(r)
      setCategories(sortCategories(c))
      setError(undefined)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // wait until it is known whether an account is signed in, or the signed-out list would flash first
  const { status: authStatus } = useAuth()
  const authReady = authStatus !== 'loading'
  useEffect(() => {
    if (authReady) void refresh()
  }, [refresh, authReady])

  // signing in or out swaps the store; the cloud sync also announces when it brought something new
  useEffect(() => {
    const reload = () => void refresh()
    window.addEventListener(DATA_CHANGED, reload)
    const off = onStoreSwapped(reload)
    return () => {
      window.removeEventListener(DATA_CHANGED, reload)
      off()
    }
  }, [refresh])

  const value = useMemo(
    () => ({ recipes, categories, loading, error, refresh }),
    [recipes, categories, loading, error, refresh],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
