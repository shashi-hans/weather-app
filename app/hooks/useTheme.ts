'use client'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'weathernow.theme'
const DARK_QUERY  = '(prefers-color-scheme: dark)'

export type Theme = 'day' | 'night'

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved === 'day' || saved === 'night' ? saved : null
  } catch {
    return null
  }
}

/**
 * Theme follows the operating system's light/dark setting on desktop and Android.
 * Using the toggle pins a choice that survives restarts; clearing it returns to the system setting.
 */
export function useTheme() {
  const [theme, setTheme]   = useState<Theme>('day')
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    const media  = window.matchMedia(DARK_QUERY)
    const stored = readStoredTheme()

    if (stored) {
      setPinned(true)
      setTheme(stored)
      return
    }

    setPinned(false)
    setTheme(media.matches ? 'night' : 'day')

    // Track later system changes, including a device that flips theme on a schedule.
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'night' : 'day')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [pinned])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light'
  }, [theme])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'night' ? 'day' : 'night'
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable: the choice applies to this session only.
    }
    setTheme(next)
    setPinned(true)
  }, [theme])

  const followSystem = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing stored to clear.
    }
    setPinned(false)
  }, [])

  return { isNight: theme === 'night', pinned, toggle, followSystem }
}
