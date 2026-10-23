import { useEffect, useRef, useState } from 'react'
import { backupFilename, buildBackup, importBackup } from '../storage/backup'
import type { ImportMode } from '../types'
import { useData } from '../hooks/useData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { isNativeApp } from '../lib/apiBase'
import { saveTextFile } from '../lib/download'
import { errorMessage } from '../lib/format'

type Status = { kind: 'ok' | 'error'; text: string } | null

export function BackupPage() {
  useDocumentTitle('Backup')
  const { recipes, refresh } = useData()
  const [status, setStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [pending, setPending] = useState<File | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const native = isNativeApp()

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null))
  }, [])

  async function doExport() {
    setBusy(true)
    setStatus(null)
    try {
      const blob = await buildBackup()
      const result = await saveTextFile(blob, backupFilename())
      setStatus(
        result === 'cancelled'
          ? { kind: 'ok', text: 'Export cancelled. Nothing was saved.' }
          : { kind: 'ok', text: `Exported ${recipes.length} recipe(s) (${(blob.size / 1024 / 1024).toFixed(2)} MB).` },
      )
    } catch (e) {
      setStatus({ kind: 'error', text: `Export failed: ${errorMessage(e)}` })
    } finally {
      setBusy(false)
    }
  }

  async function doImport(file: File) {
    setBusy(true)
    setStatus(null)
    try {
      const s = await importBackup(file, mode)
      await refresh()
      setStatus({
        kind: 'ok',
        text: `Imported (${mode}): ${s.recipes} recipe(s), ${s.categories} categories, ${s.images} photo(s).`,
      })
    } catch (e) {
      setStatus({ kind: 'error', text: `Import failed: ${errorMessage(e)}` })
    } finally {
      setBusy(false)
    }
  }

  function onPick(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    if (mode === 'replace') setPending(file)
    else void doImport(file)
  }

  return (
    <div className="stack">
      <h1 className="h1">Backup</h1>

      <p className="notice notice--warn" role="note">
        {native ? (
          <>
            <strong>Your data is stored only in this app on this phone.</strong> There is no account and no cloud copy.
            Uninstalling the app, clearing its storage or switching phones loses your recipes. Export a backup regularly.
          </>
        ) : (
          <>
            <strong>Your data is stored only in this browser.</strong> There is no account and no cloud copy. Clearing
            site data, uninstalling the browser or switching devices loses your recipes. Export a backup regularly.
          </>
        )}
      </p>

      <section className="panel stack stack--tight" aria-labelledby="export-h">
        <h2 id="export-h" className="h2">
          Export
        </h2>
        <p className="muted">
          {native ? 'Opens the share sheet' : 'Downloads'} with one JSON file holding all recipes, categories and photos
          (embedded as base64).{native && ' Choose Drive, Files or email to keep a copy off the phone.'}
        </p>
        <div>
          <button type="button" className="btn btn--primary" onClick={() => void doExport()} disabled={busy}>
            Export all data
          </button>
        </div>
      </section>

      <section className="panel stack stack--tight" aria-labelledby="import-h">
        <h2 id="import-h" className="h2">
          Import
        </h2>
        <fieldset className="fieldset fieldset--bare">
          <legend>If recipes already exist</legend>
          <label className="radio">
            <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            <span>
              <strong>Merge</strong>: add imported items; same-ID recipes and categories are overwritten, everything else
              is kept.
            </span>
          </label>
          <label className="radio">
            <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <span>
              <strong>Replace</strong>: erase everything here first, then load the backup.
            </span>
          </label>
        </fieldset>
        <div>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            Choose backup file…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-file-input"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </div>
      </section>

      {!native && (
        <section className="panel stack stack--tight" aria-labelledby="app-h">
          <h2 id="app-h" className="h2">
            Android app
          </h2>
          <p className="muted">
            An installable app with its own icon that opens full screen. It keeps its own copy of your recipes on the phone,
            separate from this browser.
          </p>
          <ol className="steps">
            <li>On your Android phone, open this page in Chrome and tap the download button below.</li>
            <li>
              Open the downloaded file. Android will ask to allow Chrome to install apps: allow it for this one install.
              Play Protect may call the app “unrecognized” because it does not come from the Play Store.
            </li>
            <li>To move your recipes: Export here, then Import in the app (Backup page).</li>
          </ol>
          <div>
            <a className="btn" href="/downloads/recipe-box.apk" download>
              Download Android app (.apk)
            </a>
          </div>
        </section>
      )}

      {status && (
        <p className={status.kind === 'ok' ? 'notice notice--ok' : 'error'} role={status.kind === 'ok' ? 'status' : 'alert'}>
          {status.text}
        </p>
      )}

      <p className="muted small">
        Persistent storage:{' '}
        {persisted === null ? 'unknown in this browser' : persisted ? 'granted (less likely to be evicted)' : 'not granted (the browser may evict data under storage pressure)'}
        .
      </p>

      <ConfirmDialog
        open={pending !== null}
        title="Replace all data?"
        confirmLabel="Replace everything"
        danger
        onConfirm={() => {
          const f = pending
          setPending(null)
          if (f) void doImport(f)
        }}
        onCancel={() => setPending(null)}
      >
        <p>
          All current recipes, categories and photos in this browser will be erased and replaced with the contents of “
          {pending?.name}”. Export first if you are unsure.
        </p>
      </ConfirmDialog>
    </div>
  )
}
