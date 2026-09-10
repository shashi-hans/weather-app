import type { WeatherData } from '../weather'

export type WeatherQuery =
  | { kind: 'city'; city: string }
  | { kind: 'coords'; lat: number; lon: number }

/** Cache key for a query. Coordinates are rounded so nearby requests share an entry. */
export function queryKey(q: WeatherQuery): string {
  return q.kind === 'city'
    ? `city:${q.city.trim().toLowerCase()}`
    : `coords:${q.lat.toFixed(2)},${q.lon.toFixed(2)}`
}

/**
 * Raised by a provider that cannot answer.
 * `exhausted` marks a quota or rate limit, which puts the provider on cooldown
 * rather than failing it for this one request.
 */
export class ProviderError extends Error {
  readonly exhausted: boolean
  readonly notFound: boolean

  constructor(message: string, opts: { exhausted?: boolean; notFound?: boolean } = {}) {
    super(message)
    this.name = 'ProviderError'
    this.exhausted = opts.exhausted ?? false
    this.notFound = opts.notFound ?? false
  }
}

export type WeatherProvider = {
  /** Stable name, used in cooldown bookkeeping and the response header. */
  id: string
  /** False when the provider is not configured, such as a missing API key. */
  isConfigured(): boolean
  fetchWeather(query: WeatherQuery, signal: AbortSignal): Promise<WeatherData>
}

export type PlaceName = { name: string; country: string }

export type Geocoder = {
  id: string
  reverse(lat: number, lon: number, signal: AbortSignal): Promise<PlaceName>
}
