import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const TIP_KEY = 'recipe-box:account-tip'
const tipSeen = () => {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return false
  }
}

/** Two short notices above every screen: add this phone's recipes to a new account, or (once) suggest signing in. */
export function CloudPrompts() {
  const a = useAuth()
  const [tipGone, setTipGone] = useState(tipSeen)

  if (a.status === 'signedIn' && a.offerCount > 0) {
    return (
      <div className="notice stack stack--tight" role="region" aria-label="Add this phone's recipes to your account">
        <p>
          This phone has <strong>{a.offerCount}</strong> {a.offerCount === 1 ? 'recipe' : 'recipes'} saved only here. Add {a.offerCount === 1 ? 'it' : 'them'} to your account so
          {a.offerCount === 1 ? ' it is' : ' they are'} on all your phones?
        </p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={() => void a.addPhoneRecipes()} disabled={a.busy}>
            {a.busy ? 'Adding…' : 'Add to my account'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => void a.keepPhoneRecipesSeparate()} disabled={a.busy}>
            Not now
          </button>
        </div>
        {a.error && (
          <p className="error" role="alert">
            {a.error}
          </p>
        )}
      </div>
    )
  }

  if (a.status === 'signedOut' && !tipGone) {
    return (
      <div className="notice stack stack--tight" role="region" aria-label="Sign in">
        <p>
          <strong>New:</strong> sign in with Google and your recipes are saved in your own account, on every phone you use.
        </p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={() => void a.signIn()} disabled={a.busy}>
            Sign in with Google
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              try {
                localStorage.setItem(TIP_KEY, '1')
              } catch {
                /* it will just show again */
              }
              setTipGone(true)
            }}
          >
            Later
          </button>
        </div>
        {a.error && (
          <p className="error" role="alert">
            {a.error}
          </p>
        )}
      </div>
    )
  }
  return null
}
