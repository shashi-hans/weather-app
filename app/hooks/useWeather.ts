'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { WeatherData } from '../lib/weather'

type Status = 'idle' | 'locating' | 'loading' | 'success' | 'error'

const GEOLOCATION_TIMEOUT_MS = 10000
const FALLBACK_CITY = 'London'

export function useWeather() {
  const [data, setData]     = useState<(WeatherData & { isMock?: boolean }) | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError]   = useState<string>('')

  // Identifies the newest request so a slow earlier response cannot overwrite a newer one.
  const requestId = useRef(0)
  const inFlight  = useRef<AbortController | null>(null)
  const mounted   = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      inFlight.current?.abort()
    }
  }, [])

  const fetchWeather = useCallback(async (params: { lat?: number; lon?: number; city?: string }) => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    const id = ++requestId.current

    setStatus('loading')
    setError('')
    try {
      const qs = params.city
        ? `city=${encodeURIComponent(params.city)}`
        : `lat=${params.lat}&lon=${params.lon}`
      const res  = await fetch(`/api/weather?${qs}`, { signal: controller.signal })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch weather')
      if (id !== requestId.current || !mounted.current) return
      setData(json)
      setStatus('success')
    } catch (err) {
      if (controller.signal.aborted || id !== requestId.current || !mounted.current) return
      setError(err instanceof Error ? err.message : 'Failed to fetch weather')
      setStatus('error')
    }
  }, [])

  const fetchByLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setStatus('error')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      // Permission denied or lookup failed, so show a known city rather than an empty screen.
      () => fetchWeather({ city: FALLBACK_CITY }),
      { timeout: GEOLOCATION_TIMEOUT_MS }
    )
  }, [fetchWeather])

  const fetchByCity = useCallback(
    (cityName: string) => fetchWeather({ city: cityName }),
    [fetchWeather]
  )

  return { data, status, error, fetchByLocation, fetchByCity }
}
