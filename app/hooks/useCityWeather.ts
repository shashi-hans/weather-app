'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { WeatherData } from '../lib/weather'
import { loadCities, saveCities, newCityKey, sameCity, MAX_SAVED_CITIES } from '../lib/cities'
import { loadCached, saveCached, removeCached, pruneCache, isFresh } from '../lib/weatherCache'
import { fetchWeather } from '../lib/weatherClient'
import type { WeatherQuery } from '../lib/providers/types'

/** Key of the first card, which always tracks the device location. It cannot be removed. */
export const LOCATION_KEY = 'current-location'

/** A cold GPS fix on a phone indoors regularly needs more than ten seconds. */
const GEOLOCATION_TIMEOUT_MS = 20000

/** Accept a fix the device already has, which answers immediately instead of waking the GPS. */
const GEOLOCATION_MAX_AGE_MS = 10 * 60 * 1000

/** Shown only when the device has no location and no earlier reading to fall back on. */
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
  /** When the shown reading was stored, set only while a refresh has failed and the cache is standing in. */
  cachedAt?: number
  /**
   * Why the location card is showing a stand-in city. Set only on that card, and only
   * when the device gave no position, so a reader is never told they are somewhere
   * they are not.
   */
  locationNote?: string
}

/** What to tell a reader when the device declines to give a position. */
function geolocationNote(code: number, city: string): string {
  if (code === 1) return `Location permission is off. Showing ${city}.`
  if (code === 3) return `Location timed out. Showing ${city}.`
  return `Device location is unavailable. Showing ${city}.`
}

export type AddResult = { ok: true } | { ok: false; reason: string }

/**
 * Builds a card, showing the stored reading straight away when one is held.
 * This reads localStorage, so it must only run after mount. Calling it during
 * render would make the server and the browser produce different markup.
 */
function entryFor(key: string, label: string, removable: boolean): CityEntry {
  const cached = loadCached(key)
  if (!cached) return { key, label, removable, status: 'loading' }
  // cachedAt stays unset here. It marks a reading standing in for a failed refresh,
  // and a refresh has not been attempted yet, so setting it would show the offline
  // note on a card that is about to update normally.
  return {
    key,
    label: cached.data.current.name || label,
    removable,
    status: 'success',
    data: cached.data,
  }
}

/** The card the server renders. It carries no stored reading, so both sides start identical. */
function blankLocationEntry(): CityEntry {
  return { key: LOCATION_KEY, label: 'Your location', removable: false, status: 'loading' }
}

export function useCityWeather() {
  const [entries, setEntries]         = useState<CityEntry[]>([blankLocationEntry()])
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
    async (key: string, query: WeatherQuery) => {
      controllers.current.get(key)?.abort()
      const controller = new AbortController()
      controllers.current.set(key, controller)

      patch(key, { status: 'loading', error: undefined })
      try {
        const json = await fetchWeather(query, controller.signal)
        saveCached(key, json)
        patch(key, {
          status: 'success', data: json, label: json.current.name,
          error: undefined, cachedAt: undefined,
        })
      } catch (err) {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Failed to fetch weather'
        // A stored reading beats an error screen when the device has no connection.
        const cached = loadCached(key)
        if (cached) {
          patch(key, {
            status: 'success', data: cached.data, label: cached.data.current.name,
            error: undefined, cachedAt: cached.savedAt,
          })
        } else {
          patch(key, { status: 'error', error: message, cachedAt: undefined })
        }
      } finally {
        if (controllers.current.get(key) === controller) controllers.current.delete(key)
      }
    },
    [patch]
  )

  /**
   * Asks the device where it is, then loads that card.
   *
   * Resolves once the reading is in, however it got there, so a caller that holds a
   * spinner up has something to wait on. A position arrives through a callback, so
   * the promise is what carries that back out.
   */
  const loadLocation = useCallback((): Promise<void> => {
    if (!navigator.geolocation) {
      patch(LOCATION_KEY, { locationNote: `This device has no location. Showing ${FALLBACK_CITY}.` })
      return load(LOCATION_KEY, { kind: 'city', city: FALLBACK_CITY })
    }
    patch(LOCATION_KEY, { status: 'loading', error: undefined })

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          patch(LOCATION_KEY, { locationNote: undefined })
          void load(LOCATION_KEY, { kind: 'coords', lat: pos.coords.latitude, lon: pos.coords.longitude })
            .finally(resolve)
        },
        (err) => {
        /*
         * No location available. The city this card last showed is a far better guess
         * than a fixed default, which would drop a reader in India onto London. The note
         * says which case this is, because a stand-in city under a location pin otherwise
         * looks like the app placing the reader in the wrong town.
         */
          const city = loadCached(LOCATION_KEY)?.data.current.name || FALLBACK_CITY
          patch(LOCATION_KEY, { locationNote: geolocationNote(err.code, city) })
          void load(LOCATION_KEY, { kind: 'city', city }).finally(resolve)
        },
        {
          /*
           * Android hands a plain request to the network provider, which answers with
           * nothing on a device that holds no recent fix. Asking for high accuracy puts
           * the request on the fused and GPS providers instead.
           */
          enableHighAccuracy: true,
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: GEOLOCATION_MAX_AGE_MS,
        }
      )
    })
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
      entryFor(LOCATION_KEY, 'Your location', false),
      ...saved.map((c) => entryFor(c.key, c.name, true)),
    ])
    setRestored(true)

    // A reading stored minutes ago is shown as it is, so start-up makes no request for it.
    const stale = (key: string) => {
      const held = loadCached(key)
      return !held || !isFresh(held.savedAt)
    }

    if (stale(LOCATION_KEY)) void loadLocation()
    saved
      .filter((c) => stale(c.key))
      .forEach((c) => void load(c.key, { kind: 'city', city: c.name }))
  }, [load, loadLocation])

  // Drop stored readings for cards that no longer exist.
  useEffect(() => {
    if (!restored) return
    pruneCache(entries.map((e) => e.key))
  }, [entries, restored])

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
        data = await fetchWeather({ kind: 'city', city: name }, new AbortController().signal)
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        return { ok: false, reason: message || 'Could not reach the weather service' }
      }
      if (!mounted.current) return { ok: false, reason: 'Cancelled' }

      // Check again against the resolved name, so "bangalore" does not duplicate "Bengaluru".
      const resolved = entries.findIndex((e) => matches(e, data.current.name))
      if (resolved !== -1) {
        setActiveIndex(resolved)
        return { ok: false, reason: `${data.current.name} is already on the list` }
      }

      const key = newCityKey()
      saveCached(key, data)
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
    removeCached(key)
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

  /*
   * Ask again when the app comes back to the front, but only while the location card
   * is standing in for a missing position. Someone who just switched location on in
   * Android's settings returns to the card that sent them there, and having to press
   * a button as well would read as the switch not having worked.
   */
  const locationStoodIn = useRef(false)
  useEffect(() => {
    locationStoodIn.current = entries.some((e) => e.key === LOCATION_KEY && e.locationNote !== undefined)
  }, [entries])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && locationStoodIn.current) void loadLocation()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadLocation])

  const retry = useCallback(
    (entry: CityEntry) => {
      if (entry.key === LOCATION_KEY) void loadLocation()
      else void load(entry.key, { kind: 'city', city: entry.label })
    },
    [load, loadLocation]
  )

  /**
   * Reloads every card. Resolves once they have all settled, so a pull to refresh
   * can hold its spinner until the readings are actually in.
   */
  const refreshAll = useCallback(async () => {
    await Promise.all(
      entries.map((e) => {
        if (e.key === LOCATION_KEY) return loadLocation()
        return load(e.key, { kind: 'city', city: e.label })
      })
    )
  }, [entries, load, loadLocation])

  return { entries, activeIndex, setActiveIndex, addCity, removeCity, retry, refreshAll }
}
