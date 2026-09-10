'use client'
import type { WeatherData } from './weather'
import type { WeatherQuery } from './providers/types'

/**
 * How the interface asks for weather.
 *
 * Every request goes to this project's own /api/weather route, in the web build and
 * in the packaged Android app alike. Nothing calls a weather or geocoding service
 * directly from a device, so all processing of a reader's coordinates happens on
 * infrastructure under our control, in the India region.
 *
 * The packaged app has no server of its own, so it is built with the hosted origin.
 * The web build leaves this empty and calls its own origin.
 */
const API_BASE = process.env.NEXT_PUBLIC_WEATHER_API_BASE ?? ''

export type WeatherResult = WeatherData & { isMock?: boolean }

function queryString(query: WeatherQuery): string {
  return query.kind === 'city'
    ? `city=${encodeURIComponent(query.city)}`
    : `lat=${query.lat}&lon=${query.lon}`
}

export async function fetchWeather(
  query: WeatherQuery,
  signal: AbortSignal
): Promise<WeatherResult> {
  const res = await fetch(`${API_BASE}/api/weather?${queryString(query)}`, { signal })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Failed to fetch weather')
  return json
}
