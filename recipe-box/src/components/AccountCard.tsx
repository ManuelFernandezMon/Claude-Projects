import { useState } from 'react'
import { ArrowsClockwise, CloudCheck, CloudSlash, GoogleLogo, SignOut, WarningCircle } from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import { ConfirmDialog } from './ConfirmDialog'

function ago(ms?: number): string {
  if (!ms) return 'not yet'
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s} seconds ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  return `${Math.round(m / 60)} h ago`
}

/** Sign in with Google, see that the recipes are safe in the cloud, sign out. */
export function AccountCard() {
  const a = useAuth()
  const [confirmOut, setConfirmOut] = useState(false)

  if (a.status === 'loading') return null
  if (a.status === 'unconfigured') {
    return (
      <section className="panel stack stack--tight" aria-labelledby="acct-h">
        <h2 id="acct-h" className="h2">
          Account
        </h2>
        <p className="muted small">Cloud accounts are not set up on this server yet, so recipes stay on this phone. Use the backup below to keep them safe.</p>
      </section>
    )
  }

  if (a.status === 'signedOut') {
    return (
      <section className="panel stack stack--tight" aria-labelledby="acct-h">
        <h2 id="acct-h" className="h2">
          Account
        </h2>
        <p className="small">
          Sign in to keep your recipes in your own account. They follow you to any phone you sign in on, and nobody else sees them.
        </p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={() => void a.signIn()} disabled={a.busy}>
            <GoogleLogo aria-hidden="true" weight="bold" />
            {a.busy ? 'Opening Google…' : 'Sign in with Google'}
          </button>
        </div>
        {a.error && (
          <p className="error" role="alert">
            {a.error}
          </p>
        )}
      </section>
    )
  }

  const s = a.sync
  const pending = s?.pending ?? 0
  const icon = s?.state === 'error' ? <WarningCircle aria-hidden="true" /> : s?.state === 'offline' ? <CloudSlash aria-hidden="true" /> : <CloudCheck aria-hidden="true" />
  const waiting = `${pending} ${pending === 1 ? 'change' : 'changes'}`
  const line =
    s?.state === 'syncing'
      ? 'Syncing…'
      : s?.state === 'offline'
        ? `Offline${pending ? ` · ${waiting} waiting to upload` : ''}`
        : s?.state === 'error'
          ? s.authFailed
            ? 'The cloud did not accept this sign-in. Sign out and in again.'
            : `Could not sync${pending ? ` · ${waiting} waiting` : ''}. It will try again.`
          : pending
            ? `${waiting} waiting to upload`
            : `All saved · synced ${ago(s?.lastSyncAt)}`

  return (
    <section className="panel stack stack--tight" aria-labelledby="acct-h">
      <h2 id="acct-h" className="h2">
        Account
      </h2>
      <p>
        <strong>{a.user?.name || a.user?.email}</strong>
        {a.user?.name && a.user.email ? <span className="muted small"> · {a.user.email}</span> : null}
      </p>
      <p className="small row" role="status" data-testid="sync-line">
        {icon}
        <span>{line}</span>
      </p>
      {s?.state === 'error' && s.error && !s.authFailed && <p className="muted small">{s.error}</p>}
      <div className="row">
        <button type="button" className="btn" onClick={() => void a.syncNow()} disabled={s?.state === 'syncing'}>
          <ArrowsClockwise aria-hidden="true" />
          Sync now
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setConfirmOut(true)} disabled={a.busy}>
          <SignOut aria-hidden="true" />
          Sign out
        </button>
      </div>
      <ConfirmDialog
        open={confirmOut}
        title="Sign out?"
        confirmLabel="Sign out"
        onConfirm={() => {
          setConfirmOut(false)
          void a.signOut()
        }}
        onCancel={() => setConfirmOut(false)}
      >
        {pending > 0 ? `${waiting} ${pending === 1 ? 'has' : 'have'} not been uploaded yet and will be lost. ` : ''}
        Your recipes stay in your account. This phone will go back to its own, signed-out copy.
      </ConfirmDialog>
    </section>
  )
}
