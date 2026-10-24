import { useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import { useUpdateCheck } from '../hooks/useUpdateCheck'
import { INSTALLED_VERSION, apkUrl, dismissUpdate, dismissedUpdate } from '../lib/update'

/** A banner on the home screen of the installed Android app when a newer version can be downloaded. */
export function UpdateNotice() {
  const update = useUpdateCheck()
  const [hidden, setHidden] = useState<string | undefined>(dismissedUpdate)
  if (update.status !== 'available' || hidden === update.latest) return null
  return (
    <section className="notice notice--warn stack stack--tight" aria-label="Update available">
      <p>
        <strong>Version {update.latest} is available.</strong> You have {INSTALLED_VERSION}. Download it and open the file to
        install it over this app; your recipes stay.
      </p>
      <div className="row">
        <a className="btn btn--primary" href={apkUrl()} target="_blank" rel="noopener noreferrer">
          <DownloadSimple aria-hidden="true" />
          Download update
        </a>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            dismissUpdate(update.latest)
            setHidden(update.latest)
          }}
        >
          Later
        </button>
      </div>
    </section>
  )
}
