'use client'

/**
 * The few native calls the packaged Android app adds to the page.
 *
 * Capacitor injects a `Capacitor` global into the WebView at runtime, so the plugin
 * is reached through that rather than by importing @capacitor/core. The web build
 * then needs no Capacitor dependency at all, and every call below simply reports
 * that it is unavailable.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean
  Plugins?: {
    LocationSettings?: { open: () => Promise<void> }
  }
}

function capacitor(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null
  const found = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
  return found?.isNativePlatform?.() ? found : null
}

/** Whether this page can take the reader to Android's location settings. */
export function canOpenLocationSettings(): boolean {
  return capacitor()?.Plugins?.LocationSettings !== undefined
}

/**
 * Opens Android's location settings screen. Does nothing in a browser.
 * Failure is swallowed: the reader can still reach the screen themselves, and an
 * error thrown from a button that only offers a shortcut is not worth showing.
 */
export async function openLocationSettings(): Promise<void> {
  try {
    await capacitor()?.Plugins?.LocationSettings?.open()
  } catch (err) {
    console.warn('Could not open location settings:', err)
  }
}
