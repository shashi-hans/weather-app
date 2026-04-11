import { NextRequest, NextResponse } from 'next/server'
import type { WeatherData, CurrentWeather, HourlyForecast, DailyForecast } from '@/app/lib/weather'
import { getMockWeatherData } from '@/app/lib/weather'

const API_KEY = (process as any).env.OPENWEATHER_API_KEY ?? ''
const BASE    = 'https://api.openweathermap.org'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat  = searchParams.get('lat')
  const lon  = searchParams.get('lon')
  const city = searchParams.get('city')

  // ── No API key → return beautiful mock data ──────────────────────────────
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    const mockCity = city ?? 'New York'
    return NextResponse.json({ ...getMockWeatherData(mockCity), isMock: true })
  }

  try {
    let locationQuery: string

    if (city) {
      locationQuery = `q=${encodeURIComponent(city)}`
    } else if (lat && lon) {
      locationQuery = `lat=${lat}&lon=${lon}`
    } else {
      return NextResponse.json({ error: 'Provide lat/lon or city' }, { status: 400 })
    }

    // ── Fetch current weather, forecast, and UV in parallel ──────────────────
    const [weatherRes, forecastRes] = await Promise.all([
      fetch(`${BASE}/data/2.5/weather?${locationQuery}&units=metric&appid=${API_KEY}`),
      fetch(`${BASE}/data/2.5/forecast?${locationQuery}&units=metric&cnt=40&appid=${API_KEY}`),
    ])

    if (!weatherRes.ok) throw new Error(`OpenWeather error: ${weatherRes.status}`)
    if (!forecastRes.ok) throw new Error(`OpenWeather forecast error: ${forecastRes.status}`)

    const w = await weatherRes.json()
    const f = await forecastRes.json()

    // UV index — fetch by resolved coordinates (deprecated endpoint, but still live)
    let uvIndex = 0
    const uvRes = await fetch(
      `${BASE}/data/2.5/uvi?lat=${w.coord.lat}&lon=${w.coord.lon}&appid=${API_KEY}`
    )
    if (uvRes.ok) {
      const uvData = await uvRes.json()
      uvIndex = uvData.value ?? 0
    }

    const current: CurrentWeather = {
      name:        w.name,
      country:     w.sys.country,
      lat:         w.coord.lat,
      lon:         w.coord.lon,
      temp:        w.main.temp,
      feels_like:  w.main.feels_like,
      temp_min:    w.main.temp_min,
      temp_max:    w.main.temp_max,
      humidity:    w.main.humidity,
      pressure:    w.main.pressure,
      visibility:  w.visibility ?? 10000,
      wind_speed:  w.wind.speed,
      wind_deg:    w.wind.deg ?? 0,
      clouds:      w.clouds.all,
      sunrise:     w.sys.sunrise,
      sunset:      w.sys.sunset,
      uv_index:    uvIndex,
      dt:          w.dt,
      timezone:    w.timezone,
      condition:   w.weather[0],
    }

    // ── Hourly: 3-hour slots from the forecast list (up to 24 items = 72 h) ──
    const hourly: HourlyForecast[] = f.list.slice(0, 24).map((h: any) => ({
      dt:         h.dt,
      temp:       h.main.temp,
      feels_like: h.main.feels_like,
      humidity:   h.main.humidity,
      wind_speed: h.wind.speed,
      pop:        h.pop ?? 0,
      condition:  h.weather[0],
    }))

    // ── Daily: aggregate 3-hour slots by calendar day ────────────────────────
    const dayBuckets = new Map<string, any[]>()
    for (const item of f.list) {
      const key = new Date(item.dt * 1000).toISOString().slice(0, 10)
      if (!dayBuckets.has(key)) dayBuckets.set(key, [])
      dayBuckets.get(key)!.push(item)
    }

    const daily: DailyForecast[] = Array.from(dayBuckets.entries())
      .slice(0, 7)
      .map(([, items]) => {
        const temps = items.map((i: any) => i.main.temp)
        // Pick the midday slot for a representative weather condition
        const midday =
          items.find((i: any) => {
            const h = new Date(i.dt * 1000).getUTCHours()
            return h >= 11 && h <= 14
          }) ?? items[Math.floor(items.length / 2)]
        return {
          dt:         items[0].dt,
          temp_min:   Math.min(...temps),
          temp_max:   Math.max(...temps),
          humidity:   Math.round(
            items.reduce((s: number, i: any) => s + i.main.humidity, 0) / items.length
          ),
          wind_speed: Math.round(
            (items.reduce((s: number, i: any) => s + i.wind.speed, 0) / items.length) * 10
          ) / 10,
          pop:        Math.max(...items.map((i: any) => i.pop ?? 0)),
          uv_index:   uvIndex,
          condition:  midday.weather[0],
          sunrise:    f.city.sunrise,
          sunset:     f.city.sunset,
        }
      })

    const data: WeatherData & { isMock: boolean } = { current, hourly, daily, isMock: false }
    return NextResponse.json(data)

  } catch (err: any) {
    console.error('Weather API error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
