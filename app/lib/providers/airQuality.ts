import { cacheGet, cacheSet } from '../serverCache'

/**
 * Air quality from Open-Meteo, which serves it on its own host and needs no key.
 *
 * The US AQI scale is reported because it runs 0 to 500 in bands an Indian reader
 * already recognises from CPCB, while Open-Meteo's European index uses a different
 * footing and would read as a much lower number for the same air.
 *
 * A failure here never fails a forecast: the caller gets null and the card simply
 * leaves the air quality line out.
 */

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

const REQUEST_TIMEOUT_MS = 5000

/** Upstream recomputes hourly, so a stored reading is reused for half an hour. */
const AQI_TTL_MS = 30 * 60 * 1000

/** Matches the rounding every other upstream call uses, about 1.1 km. */
const COORD_PRECISION = 2

export async function fetchAirQuality(
  lat: number,
  lon: number,
  signal: AbortSignal
): Promise<number | null> {
  const roundLat = Number(lat.toFixed(COORD_PRECISION))
  const roundLon = Number(lon.toFixed(COORD_PRECISION))

  const key = `aqi:${roundLat},${roundLon}`
  const cached = cacheGet<number>(key)
  if (cached !== null) return cached

  try {
    const url = `${AIR_QUALITY_URL}?latitude=${roundLat}&longitude=${roundLon}&current=us_aqi`
    const res = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    })
    if (!res.ok) throw new Error(`open-meteo air quality returned ${res.status}`)

    const value = (await res.json())?.current?.us_aqi
    if (typeof value !== 'number' || !Number.isFinite(value)) return null

    const aqi = Math.round(value)
    cacheSet(key, aqi, AQI_TTL_MS)
    return aqi
  } catch (err) {
    console.warn('Air quality lookup failed:', err instanceof Error ? err.message : err)
    return null
  }
}
