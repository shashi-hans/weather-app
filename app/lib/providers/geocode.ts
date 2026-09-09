import { ProviderError, type Geocoder, type PlaceName } from './types'
import { cacheGet, cacheSet, isExhausted, markExhausted } from '../serverCache'

/**
 * Turning coordinates into a city name, which Open-Meteo does not do.
 * Nominatim is tried first and BigDataCloud stands in when it is rate limited.
 */

/** A place name does not change, so a hit stays usable for a long time. */
const PLACE_TTL_MS = 24 * 60 * 60 * 1000

/** How long a rate-limited geocoder is skipped. */
const COOLDOWN_MS = 15 * 60 * 1000

const REQUEST_TIMEOUT_MS = 5000

/** Nominatim asks callers to identify themselves and to stay under one call a second. */
const USER_AGENT = 'WeatherSky/1.0 (+https://weatherskyapp.vercel.app)'

function timeout(signal: AbortSignal): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
}

const nominatim: Geocoder = {
  id: 'nominatim',
  async reverse(lat, lon, signal) {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}` +
      `&format=json&zoom=10&accept-language=en`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: timeout(signal) })
    if (res.status === 429) throw new ProviderError('nominatim rate limited', { exhausted: true })
    if (!res.ok) throw new ProviderError(`nominatim returned ${res.status}`)

    const body = await res.json()
    const a = body?.address ?? {}
    const name = a.city ?? a.town ?? a.village ?? a.municipality ?? a.state_district ?? a.state
    if (!name) throw new ProviderError('nominatim returned no place name')
    return { name, country: (a.country_code ?? '').toUpperCase() }
  },
}

const bigDataCloud: Geocoder = {
  id: 'bigdatacloud',
  async reverse(lat, lon, signal) {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    const res = await fetch(url, { signal: timeout(signal) })
    if (res.status === 429) throw new ProviderError('bigdatacloud rate limited', { exhausted: true })
    if (!res.ok) throw new ProviderError(`bigdatacloud returned ${res.status}`)

    const body = await res.json()
    const name = body?.city || body?.locality || body?.principalSubdivision
    if (!name) throw new ProviderError('bigdatacloud returned no place name')
    return { name, country: (body?.countryCode ?? '').toUpperCase() }
  },
}

const GEOCODERS: Geocoder[] = [nominatim, bigDataCloud]

/**
 * Best-effort place name for a coordinate pair.
 * Returns null when every geocoder fails, since a missing label is not worth
 * failing an otherwise complete forecast.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  signal: AbortSignal
): Promise<PlaceName | null> {
  const key = `place:${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = cacheGet<PlaceName>(key)
  if (cached) return cached

  for (const geocoder of GEOCODERS) {
    if (isExhausted(geocoder.id)) continue
    try {
      const place = await geocoder.reverse(lat, lon, signal)
      cacheSet(key, place, PLACE_TTL_MS)
      return place
    } catch (err) {
      if (err instanceof ProviderError && err.exhausted) markExhausted(geocoder.id, COOLDOWN_MS)
      console.warn(`Reverse geocode via ${geocoder.id} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return null
}
