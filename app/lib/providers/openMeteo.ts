import type { WeatherData, CurrentWeather, HourlyForecast, DailyForecast } from '../weather'
import { isDaytime } from '../weather'
import { ProviderError, type WeatherProvider, type WeatherQuery } from './types'
import { conditionFromWmo } from './wmo'
import { reverseGeocode } from './geocode'
import { cacheGet, cacheSet } from '../serverCache'

/**
 * Open-Meteo. No API key, and one call covers current, hourly and daily
 * including the UV index that OpenWeather's retired endpoint no longer serves.
 */

const FORECAST_URL  = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

const REQUEST_TIMEOUT_MS = 8000

/** Coordinates for a searched city name do not move, so they are held for a day. */
const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000

const HOURLY_SLOTS = 24

/** Days shown in the app. */
const DAILY_DAYS = 7

/**
 * One more day than the app shows. Open-Meteo starts its daily block on its own day
 * boundary, which can still be yesterday at the location shortly after local midnight,
 * so the leading stale day is dropped and this keeps DAILY_DAYS available after that.
 */
const FORECAST_DAYS = DAILY_DAYS + 1

const CURRENT_FIELDS = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'pressure_msl',
  'visibility', 'wind_speed_10m', 'wind_direction_10m', 'cloud_cover',
  'weather_code', 'uv_index', 'is_day',
].join(',')

const HOURLY_FIELDS = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
  'wind_speed_10m', 'precipitation_probability', 'weather_code',
].join(',')

const DAILY_FIELDS = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'relative_humidity_2m_mean',
  'wind_speed_10m_max', 'precipitation_probability_max', 'uv_index_max',
  'sunrise', 'sunset',
].join(',')

type Resolved = { lat: number; lon: number; name: string; country: string }

function timeout(signal: AbortSignal): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
}

function check(res: Response, label: string): void {
  if (res.status === 429) throw new ProviderError(`${label} rate limited`, { exhausted: true })
  if (!res.ok) throw new ProviderError(`${label} returned ${res.status}`)
}

/** City name to coordinates, using Open-Meteo's own geocoder. */
async function resolveCity(city: string, signal: AbortSignal): Promise<Resolved> {
  const key = `om-geo:${city.toLowerCase()}`
  const cached = cacheGet<Resolved>(key)
  if (cached) return cached

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  const res = await fetch(url, { signal: timeout(signal) })
  check(res, 'open-meteo geocoding')

  const body = await res.json()
  const hit = body?.results?.[0]
  if (!hit) throw new ProviderError('Location not found', { notFound: true })

  const resolved: Resolved = {
    lat: hit.latitude,
    lon: hit.longitude,
    name: hit.name,
    country: hit.country_code ?? '',
  }
  cacheSet(key, resolved, GEOCODE_TTL_MS)
  return resolved
}

export const openMeteo: WeatherProvider = {
  id: 'open-meteo',

  // No credential to check, so it is always available.
  isConfigured: () => true,

  async fetchWeather(query: WeatherQuery, signal: AbortSignal): Promise<WeatherData> {
    const place: Resolved =
      query.kind === 'city'
        ? await resolveCity(query.city, signal)
        : { lat: query.lat, lon: query.lon, name: '', country: '' }

    const url =
      `${FORECAST_URL}?latitude=${place.lat}&longitude=${place.lon}` +
      `&current=${CURRENT_FIELDS}&hourly=${HOURLY_FIELDS}&daily=${DAILY_FIELDS}` +
      // Metres per second and unix timestamps match the shape the rest of the app expects.
      `&wind_speed_unit=ms&timeformat=unixtime&timezone=auto&forecast_days=${FORECAST_DAYS}`

    const res = await fetch(url, { signal: timeout(signal) })
    check(res, 'open-meteo forecast')

    const body = await res.json()
    const cur = body?.current
    if (!cur || !body?.hourly?.time?.length || !body?.daily?.time?.length) {
      throw new ProviderError('open-meteo returned an unexpected payload shape')
    }

    // Open-Meteo carries no place name, so coordinate lookups borrow one from a geocoder.
    let name = place.name
    let country = place.country
    if (!name) {
      const found = await reverseGeocode(place.lat, place.lon, signal)
      name = found?.name ?? 'Your location'
      country = found?.country ?? ''
    }

    const timezone = body.utc_offset_seconds ?? 0
    const isDay = cur.is_day === 1

    const d = body.daily
    /*
     * Index of the day holding the current reading. The feed can still open on the
     * previous local day just after midnight in a timezone ahead of UTC, so the entry
     * is located by timestamp rather than assumed to be the first one.
     */
    let today = 0
    for (let i = 0; i < d.time.length; i++) {
      if (d.time[i] <= cur.time) today = i
    }

    const current: CurrentWeather = {
      name,
      country,
      lat:        body.latitude,
      lon:        body.longitude,
      temp:       cur.temperature_2m,
      feels_like: cur.apparent_temperature,
      // Open-Meteo has no "now" min and max, so today's forecast range is used.
      // That is the daily high and low a reader expects, unlike OpenWeather's station spread.
      temp_min:   d.temperature_2m_min[today],
      temp_max:   d.temperature_2m_max[today],
      humidity:   cur.relative_humidity_2m,
      pressure:   Math.round(cur.pressure_msl),
      visibility: cur.visibility ?? 10000,
      wind_speed: cur.wind_speed_10m,
      wind_deg:   cur.wind_direction_10m ?? 0,
      clouds:     cur.cloud_cover ?? 0,
      sunrise:    d.sunrise[today],
      sunset:     d.sunset[today],
      uv_index:   cur.uv_index ?? 0,
      dt:         cur.time,
      timezone,
      condition:  conditionFromWmo(cur.weather_code ?? 0, isDay),
    }

    const h = body.hourly
    // The feed starts at midnight local time, so skip the slots already past. A feed with
    // no future slot at all is stale, and its newest slots are closer than its oldest.
    const firstAhead = h.time.findIndex((t: number) => t >= current.dt)
    const startAt = firstAhead === -1 ? Math.max(0, h.time.length - HOURLY_SLOTS) : firstAhead
    const hourly: HourlyForecast[] = h.time
      .slice(startAt, startAt + HOURLY_SLOTS)
      .map((dt: number, i: number) => {
        const idx = startAt + i
        return {
          dt,
          temp:       h.temperature_2m[idx],
          feels_like: h.apparent_temperature[idx],
          humidity:   h.relative_humidity_2m[idx],
          wind_speed: h.wind_speed_10m[idx],
          pop:        (h.precipitation_probability?.[idx] ?? 0) / 100,
          condition:  conditionFromWmo(
            h.weather_code[idx],
            isDaytime(dt, current.sunrise, current.sunset)
          ),
        }
      })

    const daily: DailyForecast[] = d.time
      .slice(today, today + DAILY_DAYS)
      .map((dt: number, i: number) => {
        const idx = today + i
        return {
          dt,
          temp_min:   d.temperature_2m_min[idx],
          temp_max:   d.temperature_2m_max[idx],
          humidity:   Math.round(d.relative_humidity_2m_mean?.[idx] ?? 0),
          wind_speed: Math.round((d.wind_speed_10m_max?.[idx] ?? 0) * 10) / 10,
          pop:        (d.precipitation_probability_max?.[idx] ?? 0) / 100,
          uv_index:   d.uv_index_max?.[idx] ?? 0,
          // A day summary reads better with the daytime icon.
          condition:  conditionFromWmo(d.weather_code?.[idx] ?? 0, true),
          sunrise:    d.sunrise[idx],
          sunset:     d.sunset[idx],
        }
      })

    return { current, hourly, daily }
  },
}
