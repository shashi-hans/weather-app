import type { WeatherData, CurrentWeather, HourlyForecast, DailyForecast } from '../weather'
import { ProviderError, type WeatherProvider, type WeatherQuery } from './types'

/**
 * OpenWeatherMap, kept as the stand-in for when Open-Meteo cannot answer.
 * Needs two calls for current and forecast plus a third for UV, and its
 * forecast arrives in 3-hour slots that are grouped into days here.
 */

const API_KEY = process.env.OPENWEATHER_API_KEY ?? ''
const BASE    = 'https://api.openweathermap.org'

const REQUEST_TIMEOUT_MS = 8000

type OpenWeatherItem = {
  dt: number
  main: { temp: number; feels_like: number; humidity: number }
  wind: { speed: number; deg?: number }
  weather: Array<{ id: number; main: string; description: string; icon: string }>
  pop?: number
}

function timeout(signal: AbortSignal): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
}

export const openWeather: WeatherProvider = {
  id: 'openweathermap',

  isConfigured: () => Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY_HERE',

  async fetchWeather(query: WeatherQuery, signal: AbortSignal): Promise<WeatherData> {
    const locationQuery =
      query.kind === 'city'
        ? `q=${encodeURIComponent(query.city)}`
        : `lat=${query.lat}&lon=${query.lon}`

    const [weatherRes, forecastRes] = await Promise.all([
      fetch(`${BASE}/data/2.5/weather?${locationQuery}&units=metric&appid=${API_KEY}`, { signal: timeout(signal) }),
      fetch(`${BASE}/data/2.5/forecast?${locationQuery}&units=metric&cnt=40&appid=${API_KEY}`, { signal: timeout(signal) }),
    ])

    // An unread body holds its connection open, so discard the one no longer needed.
    if (!weatherRes.ok || !forecastRes.ok) {
      await Promise.all([
        weatherRes.body?.cancel().catch(() => {}),
        forecastRes.body?.cancel().catch(() => {}),
      ])
      if (weatherRes.status === 404) throw new ProviderError('Location not found', { notFound: true })
      if (weatherRes.status === 429 || forecastRes.status === 429) {
        throw new ProviderError('openweathermap rate limited', { exhausted: true })
      }
      if (!weatherRes.ok) throw new ProviderError(`openweathermap current returned ${weatherRes.status}`)
      throw new ProviderError(`openweathermap forecast returned ${forecastRes.status}`)
    }

    const w = await weatherRes.json()
    const f = await forecastRes.json()

    if (!w?.weather?.length || !Array.isArray(f?.list) || f.list.length === 0) {
      throw new ProviderError('openweathermap returned an unexpected payload shape')
    }

    // The UV endpoint is retired and often fails. A miss leaves the value at 0
    // rather than failing a request whose other data arrived intact.
    let uvIndex = 0
    try {
      const uvRes = await fetch(
        `${BASE}/data/2.5/uvi?lat=${w.coord.lat}&lon=${w.coord.lon}&appid=${API_KEY}`,
        { signal: timeout(signal) }
      )
      if (uvRes.ok) uvIndex = (await uvRes.json()).value ?? 0
      else await uvRes.body?.cancel().catch(() => {})
    } catch {
      uvIndex = 0
    }

    const tzOffset = w.timezone ?? 0
    const localDate = (unix: number) => new Date((unix + tzOffset) * 1000)

    // Group slots by calendar day at the location, not at UTC, so days do not split mid-evening.
    const dayBuckets = new Map<string, OpenWeatherItem[]>()
    for (const item of f.list as OpenWeatherItem[]) {
      const key = localDate(item.dt).toISOString().slice(0, 10)
      const bucket = dayBuckets.get(key)
      if (bucket) bucket.push(item)
      else dayBuckets.set(key, [item])
    }

    const daily: DailyForecast[] = Array.from(dayBuckets.values())
      .slice(0, 7)
      .map((items) => {
        const temps = items.map((i) => i.main.temp)
        // Midday slot gives the most representative condition icon for the day.
        const midday =
          items.find((i) => {
            const h = localDate(i.dt).getUTCHours()
            return h >= 11 && h <= 14
          }) ?? items[Math.floor(items.length / 2)]
        return {
          dt:         items[0].dt,
          temp_min:   Math.min(...temps),
          temp_max:   Math.max(...temps),
          humidity:   Math.round(items.reduce((s, i) => s + i.main.humidity, 0) / items.length),
          wind_speed: Math.round((items.reduce((s, i) => s + i.wind.speed, 0) / items.length) * 10) / 10,
          pop:        Math.max(...items.map((i) => i.pop ?? 0)),
          uv_index:   uvIndex,
          condition:  midday.weather[0],
          sunrise:    f.city?.sunrise ?? w.sys?.sunrise ?? 0,
          sunset:     f.city?.sunset ?? w.sys?.sunset ?? 0,
        }
      })

    const current: CurrentWeather = {
      name:       w.name,
      country:    w.sys?.country ?? '',
      lat:        w.coord.lat,
      lon:        w.coord.lon,
      temp:       w.main.temp,
      feels_like: w.main.feels_like,
      /*
       * main.temp_min and main.temp_max are the spread observed across the urban area
       * at this moment, not a daily high and low, so today's forecast range is used
       * instead to match what the reading claims to be.
       */
      temp_min:   daily[0]?.temp_min ?? w.main.temp_min,
      temp_max:   daily[0]?.temp_max ?? w.main.temp_max,
      humidity:   w.main.humidity,
      pressure:   w.main.pressure,
      visibility: w.visibility ?? 10000,
      wind_speed: w.wind?.speed ?? 0,
      wind_deg:   w.wind?.deg ?? 0,
      clouds:     w.clouds?.all ?? 0,
      sunrise:    w.sys?.sunrise ?? 0,
      sunset:     w.sys?.sunset ?? 0,
      uv_index:   uvIndex,
      dt:         w.dt,
      timezone:   tzOffset,
      condition:  w.weather[0],
    }

    const hourly: HourlyForecast[] = (f.list as OpenWeatherItem[]).slice(0, 24).map((h) => ({
      dt:         h.dt,
      temp:       h.main.temp,
      feels_like: h.main.feels_like,
      humidity:   h.main.humidity,
      wind_speed: h.wind.speed,
      pop:        h.pop ?? 0,
      condition:  h.weather[0],
    }))

    return { current, hourly, daily }
  },
}
