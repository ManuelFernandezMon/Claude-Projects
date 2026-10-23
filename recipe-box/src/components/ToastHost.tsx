import { useEffect, useState } from 'react'
import { onToast } from '../lib/toast'

/** Shows one short confirmation at a time above the tab bar. Announced to screen readers via role="status". */
export function ToastHost() {
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    let hide: number | undefined
    const off = onToast((m) => {
      setMessage(m)
      window.clearTimeout(hide)
      hide = window.setTimeout(() => setMessage(undefined), 2600)
    })
    return () => {
      off()
      window.clearTimeout(hide)
    }
  }, [])

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {message && (
        <p className="toast" key={message}>
          {message}
        </p>
      )}
    </div>
  )
}
