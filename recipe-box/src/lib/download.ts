import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNativeApp } from './apiBase'

export type SaveResult = 'saved' | 'cancelled'

/**
 * Hands a text file to the user. In a browser it downloads; in the Android app an `<a download>` on a blob URL does nothing
 * inside the WebView, so the file is written to the app cache and Android's share sheet opens (save to Drive/Files, email, ...).
 */
export async function saveTextFile(blob: Blob, filename: string): Promise<SaveResult> {
  if (!isNativeApp()) {
    downloadBlob(blob, filename)
    return 'saved'
  }
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await blob.text(),
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  try {
    await Share.share({ title: filename, dialogTitle: 'Save your backup', files: [uri] })
    return 'saved'
  } catch (e) {
    if (e instanceof Error && /cancel/i.test(e.message)) return 'cancelled'
    throw e
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
