'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'weathernow.theme'
const DARK_QUERY  = '(prefers-color-scheme: dark)'

export type Theme = 'day' | 'night'

/**
 * Theme follows the operating system's light and dark setting, and nothing else.
 * It reacts while the app is open, so a device that flips on a schedule carries the
 * app with it.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('day')

  useEffect(() => {
    /*
     * An earlier build let the reader pin a theme. That choice is cleared on first
     * run so a pin made then does not quietly override the system from here on.
     */
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage unavailable: nothing was stored to clear.
    }

    const media = window.matchMedia(DARK_QUERY)
    setTheme(media.matches ? 'night' : 'day')

    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'night' : 'day')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light'
  }, [theme])

  return { isNight: theme === 'night' }
}
