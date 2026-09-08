'use client'
import type { WeatherData } from './weather'

/**
 * Last successful reading per card, held in the browser's localStorage so the app
 * still shows something when the device is offline.
 * The cache never leaves the device: it is not sent to the server or to OpenWeather.
 */

const STORAGE_KEY = 'weathernow.cache'

/** Cached readings older than this are treated as too stale to show. */
export const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000

export type CachedWeather = {
  savedAt: number
  data: WeatherData & { isMock?: boolean }
}

type CacheFile = Record<string, CachedWeather>

function readAll(): CacheFile {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as CacheFile
  } catch {
    return {}
  }
}

function writeAll(cache: CacheFile): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Storage full or blocked. The app still works, it just cannot answer offline.
  }
}

/** Returns the stored reading for a card, or null when it is missing or too old. */
export function loadCached(key: string): CachedWeather | null {
  const entry = readAll()[key]
  if (!entry?.data?.current || typeof entry.savedAt !== 'number') return null
  if (Date.now() - entry.savedAt > MAX_CACHE_AGE_MS) return null
  return entry
}

export function saveCached(key: string, data: WeatherData & { isMock?: boolean }): void {
  // Sample data would be stored as though it were a real reading, so it is skipped.
  if (data.isMock) return
  const cache = readAll()
  cache[key] = { savedAt: Date.now(), data }
  writeAll(cache)
}

export function removeCached(key: string): void {
  const cache = readAll()
  if (!(key in cache)) return
  delete cache[key]
  writeAll(cache)
}

/** Drops entries for cards that no longer exist, so removed cities do not linger. */
export function pruneCache(keepKeys: string[]): void {
  const cache = readAll()
  const keep = new Set(keepKeys)
  let changed = false
  for (const key of Object.keys(cache)) {
    if (!keep.has(key)) { delete cache[key]; changed = true }
  }
  if (changed) writeAll(cache)
}
