'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { WeatherData } from '../lib/weather'
import { loadCities, saveCities, newCityKey, sameCity, MAX_SAVED_CITIES } from '../lib/cities'

/** Key of the first card, which always tracks the device location. It cannot be removed. */
export const LOCATION_KEY = 'current-location'

const GEOLOCATION_TIMEOUT_MS = 10000
const FALLBACK_CITY = 'London'

export type EntryStatus = 'loading' | 'success' | 'error'

export type CityEntry = {
  key: string
  /** Shown while the card is loading, then replaced by the name OpenWeather resolves. */
  label: string
  removable: boolean
  status: EntryStatus
  data?: WeatherData & { isMock?: boolean }
  error?: string
}

export type AddResult = { ok: true } | { ok: false; reason: string }

function locationEntry(): CityEntry {
  return { key: LOCATION_KEY, label: 'Your location', removable: false, status: 'loading' }
}

export function useCityWeather() {
  const [entries, setEntries]         = useState<CityEntry[]>([locationEntry()])
  const [activeIndex, setActiveIndex] = useState(0)
  const [restored, setRestored]       = useState(false)

  const controllers = useRef(new Map<string, AbortController>())
  const mounted     = useRef(true)
  /** Key of a card just added, so the carousel moves to it once it is in the list. */
  const pendingKey  = useRef<string | null>(null)

  useEffect(() => {
    mounted.current = true
    const running = controllers.current
    return () => {
      mounted.current = false
      running.forEach((c) => c.abort())
      running.clear()
    }
  }, [])

  const patch = useCallback((key: string, changes: Partial<CityEntry>) => {
    if (!mounted.current) return
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...changes } : e)))
  }, [])

  /** Loads one card. A previous request for the same card is cancelled first. */
  const load = useCallback(
    async (key: string, query: string) => {
      controllers.current.get(key)?.abort()
      const controller = new AbortController()
      controllers.current.set(key, controller)

      patch(key, { status: 'loading', error: undefined })
      try {
        const res  = await fetch(`/api/weather?${query}`, { signal: controller.signal })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to fetch weather')
        patch(key, { status: 'success', data: json, label: json.current.name, error: undefined })
      } catch (err) {
        if (controller.signal.aborted) return
        patch(key, { status: 'error', error: err instanceof Error ? err.message : 'Failed to fetch weather' })
      } finally {
        if (controllers.current.get(key) === controller) controllers.current.delete(key)
      }
    },
    [patch]
  )

  const loadLocation = useCallback(() => {
    if (!navigator.geolocation) {
      void load(LOCATION_KEY, `city=${encodeURIComponent(FALLBACK_CITY)}`)
      return
    }
    patch(LOCATION_KEY, { status: 'loading', error: undefined })
    navigator.geolocation.getCurrentPosition(
      (pos) => void load(LOCATION_KEY, `lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      // Permission denied or lookup failed, so show a known city rather than an empty card.
      () => void load(LOCATION_KEY, `city=${encodeURIComponent(FALLBACK_CITY)}`),
      { timeout: GEOLOCATION_TIMEOUT_MS }
    )
  }, [load, patch])

  /*
   * Restore the saved list and load every card.
   * Both callbacks are stable, so this runs once per mount. It deliberately carries no
   * "already ran" flag: unmounting aborts the requests it started, and React's development
   * double-mount would otherwise skip the re-run and leave those cards stuck loading.
   */
  useEffect(() => {
    const saved = loadCities()
    setEntries([
      locationEntry(),
      ...saved.map((c) => ({ key: c.key, label: c.name, removable: true, status: 'loading' as const })),
    ])
    setRestored(true)

    loadLocation()
    saved.forEach((c) => void load(c.key, `city=${encodeURIComponent(c.name)}`))
  }, [load, loadLocation])

  // Mirror the removable cards back to storage once the restore has run,
  // so an empty first render cannot wipe the saved list.
  useEffect(() => {
    if (!restored) return
    saveCities(
      entries
        .filter((e) => e.removable)
        .map((e) => ({ key: e.key, name: e.data?.current.name ?? e.label }))
    )
  }, [entries, restored])

  /**
   * Looks the city up before adding a card, so a name OpenWeather cannot resolve
   * reports back to the caller instead of leaving a card stuck in an error state.
   */
  const addCity = useCallback(
    async (rawName: string): Promise<AddResult> => {
      const name = rawName.trim()
      if (!name) return { ok: false, reason: 'Enter a city name' }

      const matches = (entry: CityEntry, candidate: string) =>
        sameCity(entry.label, candidate) ||
        (entry.data ? sameCity(entry.data.current.name, candidate) : false)

      const typed = entries.findIndex((e) => matches(e, name))
      if (typed !== -1) {
        setActiveIndex(typed)
        return { ok: false, reason: `${name} is already on the list` }
      }
      if (entries.filter((e) => e.removable).length >= MAX_SAVED_CITIES) {
        return { ok: false, reason: `You can save up to ${MAX_SAVED_CITIES} cities` }
      }

      let data: WeatherData & { isMock?: boolean }
      try {
        const res  = await fetch(`/api/weather?city=${encodeURIComponent(name)}`)
        const json = await res.json()
        if (!res.ok) return { ok: false, reason: json.error ?? 'Could not add that city' }
        data = json
      } catch {
        return { ok: false, reason: 'Could not reach the weather service' }
      }
      if (!mounted.current) return { ok: false, reason: 'Cancelled' }

      // Check again against the resolved name, so "bangalore" does not duplicate "Bengaluru".
      const resolved = entries.findIndex((e) => matches(e, data.current.name))
      if (resolved !== -1) {
        setActiveIndex(resolved)
        return { ok: false, reason: `${data.current.name} is already on the list` }
      }

      const key = newCityKey()
      setEntries((prev) => [
        ...prev,
        { key, label: data.current.name, removable: true, status: 'success', data },
      ])
      // The position is resolved from the updated list rather than from the length captured
      // before the lookup, which a removal during the lookup would have made wrong.
      pendingKey.current = key
      return { ok: true }
    },
    [entries]
  )

  const removeCity = useCallback((key: string) => {
    controllers.current.get(key)?.abort()
    controllers.current.delete(key)
    setEntries((prev) => prev.filter((e) => e.key !== key || !e.removable))
  }, [])

  // Keep the active card inside the list. This lives in an effect rather than in the
  // removeCity updater, because a state updater must be pure.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(entries.length - 1, 0)))
  }, [entries.length])

  // Move to a card added by addCity, once the appended list has rendered.
  useEffect(() => {
    if (!pendingKey.current) return
    const index = entries.findIndex((e) => e.key === pendingKey.current)
    if (index === -1) return
    pendingKey.current = null
    setActiveIndex(index)
  }, [entries])

  const retry = useCallback(
    (entry: CityEntry) => {
      if (entry.key === LOCATION_KEY) loadLocation()
      else void load(entry.key, `city=${encodeURIComponent(entry.label)}`)
    },
    [load, loadLocation]
  )

  return { entries, activeIndex, setActiveIndex, addCity, removeCity, retry }
}
