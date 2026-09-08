import { NextRequest, NextResponse } from 'next/server'
import type { WeatherData, CurrentWeather, HourlyForecast, DailyForecast } from '@/app/lib/weather'
import { getMockWeatherData } from '@/app/lib/weather'

const API_KEY = process.env.OPENWEATHER_API_KEY ?? ''
const BASE    = 'https://api.openweathermap.org'

/** Upstream calls are aborted after this many ms so a hung request cannot hold the route open. */
const UPSTREAM_TIMEOUT_MS = 8000

/** Longest accepted city name. Keeps a huge string out of the upstream query. */
const MAX_CITY_LENGTH = 100

/** Seconds the CDN may serve a cached response. Weather changes slowly; this cuts upstream calls. */
const CACHE_SECONDS = 300

type OpenWeatherItem = {
  dt: number
  main: { temp: number; feels_like: number; humidity: number }
  wind: { speed: number; deg?: number }
  weather: Array<{ id: number; main: string; description: string; icon: string }>
  pop?: number
}

function fetchUpstream(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
}

/** Parse a coordinate string, returning null when it is not a real number in range. */
function parseCoord(value: string | null, limit: number): number | null {
  if (value === null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null
  return n
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const rawCity = searchParams.get('city')
  const city    = rawCity?.trim() ?? ''
  const lat     = parseCoord(searchParams.get('lat'), 90)
  const lon     = parseCoord(searchParams.get('lon'), 180)

  if (city.length > MAX_CITY_LENGTH) {
    return badRequest(`City name must be ${MAX_CITY_LENGTH} characters or fewer`)
  }
  if (!city && (searchParams.has('lat') || searchParams.has('lon')) && (lat === null || lon === null)) {
    return badRequest('lat must be -90..90 and lon must be -180..180')
  }

  // No API key configured, so serve sample data instead of failing.
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    return NextResponse.json({ ...getMockWeatherData(city || 'New York'), isMock: true })
  }

  // Both values are validated above, so they are safe to place in the upstream query string.
  const locationQuery = city
    ? `q=${encodeURIComponent(city)}`
    : lat !== null && lon !== null
    ? `lat=${lat}&lon=${lon}`
    : null

  if (!locationQuery) return badRequest('Provide lat/lon or city')

  try {
    const [weatherRes, forecastRes] = await Promise.all([
      fetchUpstream(`${BASE}/data/2.5/weather?${locationQuery}&units=metric&appid=${API_KEY}`),
      fetchUpstream(`${BASE}/data/2.5/forecast?${locationQuery}&units=metric&cnt=40&appid=${API_KEY}`),
    ])

    if (weatherRes.status === 404) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    if (!weatherRes.ok) throw new Error(`OpenWeather current returned ${weatherRes.status}`)
    if (!forecastRes.ok) throw new Error(`OpenWeather forecast returned ${forecastRes.status}`)

    const w = await weatherRes.json()
    const f = await forecastRes.json()

    if (!w?.weather?.length || !Array.isArray(f?.list) || f.list.length === 0) {
      throw new Error('OpenWeather returned an unexpected payload shape')
    }

    // UV index by resolved coordinates. A failure here leaves uv at 0 rather than failing the request.
    let uvIndex = 0
    try {
      const uvRes = await fetchUpstream(
        `${BASE}/data/2.5/uvi?lat=${w.coord.lat}&lon=${w.coord.lon}&appid=${API_KEY}`
      )
      if (uvRes.ok) uvIndex = (await uvRes.json()).value ?? 0
    } catch {
      uvIndex = 0
    }

    const current: CurrentWeather = {
      name:        w.name,
      country:     w.sys?.country ?? '',
      lat:         w.coord.lat,
      lon:         w.coord.lon,
      temp:        w.main.temp,
      feels_like:  w.main.feels_like,
      temp_min:    w.main.temp_min,
      temp_max:    w.main.temp_max,
      humidity:    w.main.humidity,
      pressure:    w.main.pressure,
      visibility:  w.visibility ?? 10000,
      wind_speed:  w.wind?.speed ?? 0,
      wind_deg:    w.wind?.deg ?? 0,
      clouds:      w.clouds?.all ?? 0,
      sunrise:     w.sys?.sunrise ?? 0,
      sunset:      w.sys?.sunset ?? 0,
      uv_index:    uvIndex,
      dt:          w.dt,
      timezone:    w.timezone ?? 0,
      condition:   w.weather[0],
    }

    // Forecast slots are 3 hours apart, so 24 items cover 72 hours.
    const hourly: HourlyForecast[] = (f.list as OpenWeatherItem[]).slice(0, 24).map((h) => ({
      dt:         h.dt,
      temp:       h.main.temp,
      feels_like: h.main.feels_like,
      humidity:   h.main.humidity,
      wind_speed: h.wind.speed,
      pop:        h.pop ?? 0,
      condition:  h.weather[0],
    }))

    // Group slots by calendar day at the location, not at UTC, so days do not split mid-evening.
    const tzOffset = current.timezone
    const localDate = (unix: number) => new Date((unix + tzOffset) * 1000)

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
          wind_speed: Math.round(
            (items.reduce((s, i) => s + i.wind.speed, 0) / items.length) * 10
          ) / 10,
          pop:        Math.max(...items.map((i) => i.pop ?? 0)),
          uv_index:   uvIndex,
          condition:  midday.weather[0],
          sunrise:    f.city?.sunrise ?? current.sunrise,
          sunset:     f.city?.sunset ?? current.sunset,
        }
      })

    const data: WeatherData & { isMock: boolean } = { current, hourly, daily, isMock: false }
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    })

  } catch (err) {
    // Log the detail server-side; the client gets a generic message so upstream URLs and keys cannot leak.
    console.error('Weather API error:', err instanceof Error ? err.message : err)
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    return NextResponse.json(
      { error: timedOut ? 'Weather service timed out' : 'Could not load weather right now' },
      { status: timedOut ? 504 : 502 }
    )
  }
}
