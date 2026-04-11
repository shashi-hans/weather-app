'use client'
import { useState, useCallback } from 'react'
import type { WeatherData } from '../lib/weather'

type Status = 'idle' | 'locating' | 'loading' | 'success' | 'error'

export function useWeather() {
  const [data, setData]     = useState<(WeatherData & { isMock?: boolean }) | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError]   = useState<string>('')
  const [city, setCity]     = useState<string>('')

  const fetchWeather = useCallback(async (params: { lat?: number; lon?: number; city?: string }) => {
    setStatus('loading')
    setError('')
    try {
      const qs = params.city
        ? `city=${encodeURIComponent(params.city)}`
        : `lat=${params.lat}&lon=${params.lon}`
      const res = await fetch(`/api/weather?${qs}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch weather')
      setData(json)
      setCity(json.current.name)
      setStatus('success')
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  const fetchByLocation = useCallback(() => {
    setStatus('locating')
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser')
      setStatus('error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {
        // Fallback to IP-based or default city
        fetchWeather({ city: 'London' })
      },
      { timeout: 10000 }
    )
  }, [fetchWeather])

  const fetchByCity = useCallback(
    (cityName: string) => fetchWeather({ city: cityName }),
    [fetchWeather]
  )

  return { data, status, error, city, fetchByLocation, fetchByCity }
}
