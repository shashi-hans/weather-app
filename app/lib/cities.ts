'use client'

/**
 * Saved-city list, held in the browser's localStorage.
 * The list never leaves the device: it is not sent to the server or to OpenWeather.
 */

const STORAGE_KEY = 'weathernow.cities'

/** Upper bound on saved cities. Each one costs an API call on every app start. */
export const MAX_SAVED_CITIES = 8

/** Quick-pick suggestions offered by the search box and the add-city dialog. */
export const POPULAR_CITIES = ['New York', 'London', 'Tokyo', 'Paris', 'Dubai', 'Sydney', 'Mumbai', 'Toronto']

export type SavedCity = { key: string; name: string }

export function newCityKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `city-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Returns an empty list when storage is unavailable or holds anything unexpected. */
export function loadCities(): SavedCity[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (c): c is SavedCity =>
          typeof c === 'object' && c !== null &&
          typeof (c as SavedCity).key === 'string' &&
          typeof (c as SavedCity).name === 'string' &&
          (c as SavedCity).name.trim().length > 0
      )
      .slice(0, MAX_SAVED_CITIES)
  } catch {
    return []
  }
}

/** Writing can throw when storage is full or blocked, so a failure is ignored rather than surfaced. */
export function saveCities(list: SavedCity[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SAVED_CITIES)))
  } catch {
    // Storage unavailable: the list stays for this session only.
  }
}

/** Compares city names the way a person would, ignoring case and surrounding spaces. */
export function sameCity(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
