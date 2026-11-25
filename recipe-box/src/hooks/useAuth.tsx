import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { setAiAccount } from '../lib/aiAuth'
import { isNativeApp } from '../lib/apiBase'
import { loadCloudConfig } from '../lib/cloud/config'
import { guestRecipeCount, markMigration, moveGuestToAccount } from '../lib/cloud/migrate'
import { errorMessage } from '../lib/format'
import { toast } from '../lib/toast'
import { DATA_CHANGED } from '../lib/events'
import { guestStore, recipeStore, setActiveStore } from '../storage/recipeStore'
import { createIdbRecipeStore } from '../storage/idbRecipeStore'
import { createSyncedStore, type SyncStatus, type SyncedStore } from '../storage/sync/syncedStore'
import { createSupabaseRemote } from '../storage/sync/supabaseRemote'

/** Where Google sends the person back to in the Android app (also listed under Redirect URLs in Supabase). */
export const NATIVE_REDIRECT = 'app.recipebox.personal://auth'

export interface CloudUser {
  id: string
  email: string
  name: string
}

export interface AuthState {
  /** loading: still checking · unconfigured: this server has no cloud accounts · signedOut · signedIn */
  status: 'loading' | 'unconfigured' | 'signedOut' | 'signedIn'
  user?: CloudUser
  sync?: SyncStatus
  /** Recipes saved only on this phone that could be added to the account (0 when there is nothing to offer). */
  offerCount: number
  busy: boolean
  error?: string
  signIn: () => Promise<void>
  /** Signs out and removes this account's copy from the phone. Anything not uploaded yet is lost. */
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  addPhoneRecipes: () => Promise<void>
  keepPhoneRecipesSeparate: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthState | null>(null)

const userOf = (s: Session): CloudUser => {
  const m = (s.user.user_metadata ?? {}) as Record<string, unknown>
  return { id: s.user.id, email: s.user.email ?? '', name: String(m.full_name ?? m.name ?? '') }
}

const accountDbName = (uid: string) => `recipe-box-u-${uid}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading')
  const [user, setUser] = useState<CloudUser>()
  const [sync, setSync] = useState<SyncStatus>()
  const [offerCount, setOfferCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const clientRef = useRef<SupabaseClient | null>(null)
  const activeRef = useRef<{ uid: string; store: SyncedStore } | null>(null)

  const deactivate = useCallback(async (destroy: boolean) => {
    const cur = activeRef.current
    activeRef.current = null
    setAiAccount(null)
    setActiveStore(guestStore)
    if (cur) {
      cur.store.dispose()
      if (destroy) await cur.store.local.destroy()
    }
    setSync(undefined)
    setOfferCount(0)
  }, [])

  const activate = useCallback(
    async (session: Session) => {
      const client = clientRef.current
      if (!client) return
      if (activeRef.current?.uid === session.user.id) {
        setUser(userOf(session))
        return
      }
      await deactivate(false)
      const uid = session.user.id
      const local = createIdbRecipeStore({ name: accountDbName(uid), seed: false })
      const store = createSyncedStore(local, createSupabaseRemote(client, uid), {
        onData: () => window.dispatchEvent(new Event(DATA_CHANGED)),
        onStatus: (s) => setSync({ ...s }),
      })
      activeRef.current = { uid, store }
      setAiAccount(async () => (await client.auth.getSession()).data.session?.access_token)
      setUser(userOf(session))
      setActiveStore(store)
      setStatus('signedIn')
      store.start()
      try {
        setOfferCount(await guestRecipeCount(guestStore))
      } catch {
        setOfferCount(0)
      }
    },
    [deactivate],
  )

  // start: where do accounts live, and is someone already signed in?
  useEffect(() => {
    let stopped = false
    const cleanups: (() => void)[] = []
    void (async () => {
      const cfg = await loadCloudConfig()
      if (stopped) return
      if (!cfg) {
        setStatus('unconfigured')
        return
      }
      const native = isNativeApp()
      const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: !native, storageKey: 'recipe-box-auth' },
      })
      clientRef.current = client
      const { data: sub } = client.auth.onAuthStateChange((event, session) => {
        if (stopped) return
        if (session) {
          void activate(session)
        } else if (event === 'SIGNED_OUT') {
          // not a button press (that destroys the copy itself): keep the phone's copy, so signing in again resumes it
          void deactivate(false).then(() => {
            setUser(undefined)
            setStatus('signedOut')
          })
        }
      })
      cleanups.push(() => sub.subscription.unsubscribe())

      if (native) {
        const h = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
          if (!url.startsWith(NATIVE_REDIRECT)) return
          void Browser.close().catch(() => undefined)
          const u = new URL(url)
          const problem = u.searchParams.get('error_description') ?? u.searchParams.get('error')
          const code = u.searchParams.get('code')
          if (problem) setError(problem)
          else if (code) {
            setBusy(true)
            client.auth
              .exchangeCodeForSession(code)
              .then(({ error: e }) => {
                if (e) setError(e.message)
              })
              .finally(() => setBusy(false))
          }
        })
        cleanups.push(() => void h.remove())
      }

      const { data } = await client.auth.getSession()
      if (stopped) return
      if (data.session) await activate(data.session)
      else setStatus('signedOut')
    })()
    return () => {
      stopped = true
      cleanups.forEach((c) => c())
    }
  }, [activate, deactivate])

  const signIn = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    setError(undefined)
    setBusy(true)
    try {
      const native = isNativeApp()
      const { data, error: e } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: native ? NATIVE_REDIRECT : `${window.location.origin}/`, skipBrowserRedirect: native, queryParams: { prompt: 'select_account' } },
      })
      if (e) throw e
      if (native && data.url) await Browser.open({ url: data.url })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setBusy(true)
    try {
      await deactivate(true)
      await clientRef.current?.auth.signOut()
      setUser(undefined)
      setStatus('signedOut')
      window.dispatchEvent(new Event(DATA_CHANGED))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [deactivate])

  const syncNow = useCallback(async () => {
    await activeRef.current?.store.sync()
  }, [])

  const addPhoneRecipes = useCallback(async () => {
    setBusy(true)
    try {
      const n = await moveGuestToAccount(guestStore, recipeStore)
      setOfferCount(0)
      toast(`${n} ${n === 1 ? 'recipe' : 'recipes'} added to your account`)
      void activeRef.current?.store.sync()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const keepPhoneRecipesSeparate = useCallback(async () => {
    await markMigration(guestStore, 'declined')
    setOfferCount(0)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ status, user, sync, offerCount, busy, error, signIn, signOut, syncNow, addPhoneRecipes, keepPhoneRecipesSeparate, clearError: () => setError(undefined) }),
    [status, user, sync, offerCount, busy, error, signIn, signOut, syncNow, addPhoneRecipes, keepPhoneRecipesSeparate],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
