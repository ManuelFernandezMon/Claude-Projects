import { Capacitor } from '@capacitor/core'

/**
 * On the web the API lives on the same origin. The Android app has no server of its own, so it is built with
 * VITE_API_BASE pointing at the deployed site (see .env.android).
 */
const base = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

export const apiUrl = (path: string): string => `${base}${path}`

/** True inside the Android app (the Capacitor WebView), false in a normal browser. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform()
