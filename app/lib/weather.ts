// ─── Types ────────────────────────────────────────────────────────────────────
export type WeatherCondition = {
  id: number
  main: string
  description: string
  icon: string
}

export type CurrentWeather = {
  name: string
  country: string
  lat: number
  lon: number
  temp: number
  feels_like: number
  temp_min: number
  temp_max: number
  humidity: number
  pressure: number
  visibility: number
  wind_speed: number
  wind_deg: number
  clouds: number
  sunrise: number
  sunset: number
  uv_index: number
  condition: WeatherCondition
  dt: number
  timezone: number
}

export type HourlyForecast = {
  dt: number
  temp: number
  feels_like: number
  humidity: number
  wind_speed: number
  pop: number   // probability of precipitation
  condition: WeatherCondition
}

export type DailyForecast = {
  dt: number
  temp_min: number
  temp_max: number
  humidity: number
  wind_speed: number
  pop: number
  uv_index: number
  condition: WeatherCondition
  sunrise: number
  sunset: number
}

export type WeatherData = {
  current: CurrentWeather
  hourly: HourlyForecast[]
  daily: DailyForecast[]
}

// ─── Utilities ────────────────────────────────────────────────────────────────
export function formatTemp(t: number): string {
  return `${Math.round(t)}°`
}

/**
 * Shifts a UTC timestamp by the location's offset in seconds and reads it back as UTC,
 * so every formatter below renders the clock at the location rather than on the device.
 */
function atLocation(unix: number, offset: number): Date {
  return new Date((unix + offset) * 1000)
}

export function formatTime(unix: number, offset = 0): string {
  return atLocation(unix, offset)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
}

export function formatDay(unix: number, offset = 0): string {
  return atLocation(unix, offset).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
}

export function formatDate(unix: number, offset = 0): string {
  return atLocation(unix, offset)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function formatHour(unix: number, offset = 0): string {
  return atLocation(unix, offset).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' })
}

/** Probability of precipitation, given as 0..1, rendered as a whole-percent string. */
export function formatPop(pop: number): string {
  return `${Math.round(pop * 100)}%`
}

export function windDirection(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

export function getWeatherEmoji(code: number, isDay = true): string {
  if (code >= 200 && code < 300) return '⛈️'
  if (code >= 300 && code < 400) return '🌦️'
  if (code >= 500 && code < 600) {
    if (code === 511) return '🌨️'
    if (code >= 502) return '🌧️'
    return '🌦️'
  }
  if (code >= 600 && code < 700) return '❄️'
  if (code === 701 || code === 741) return '🌫️'
  if (code === 800) return isDay ? '☀️' : '🌙'
  if (code === 801) return isDay ? '🌤️' : '🌙'
  if (code === 802) return '⛅'
  if (code >= 803) return '☁️'
  return '🌡️'
}

const SECONDS_PER_DAY = 86400

const timeOfDay = (unix: number) => ((unix % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY

/**
 * Whether a timestamp falls between sunrise and sunset at the location.
 * Weather icons use this rather than the interface theme, so a dark-themed
 * app still shows a sun for a city where it is midday.
 *
 * Only the time of day is compared, so one day's sunrise and sunset also
 * classify forecast slots two or three days out.
 */
export function isDaytime(unix: number, sunrise: number, sunset: number): boolean {
  if (!sunrise || !sunset) return true
  const t    = timeOfDay(unix)
  const rise = timeOfDay(sunrise)
  const set  = timeOfDay(sunset)
  // Past the date line the sunset lands on the next UTC day, so the daylight window wraps.
  return rise <= set ? t >= rise && t < set : t >= rise || t < set
}

export function getUVLabel(uv: number): { label: string; color: string } {
  if (uv < 3)  return { label: 'Low',      color: '#4ade80' }
  if (uv < 6)  return { label: 'Moderate', color: '#facc15' }
  if (uv < 8)  return { label: 'High',     color: '#fb923c' }
  if (uv < 11) return { label: 'Very High',color: '#f87171' }
  return { label: 'Extreme', color: '#c084fc' }
}

/**
 * Forecast slots falling inside a window that starts at the first slot.
 * Slot spacing differs between the live API (3 hours) and the sample data (1 hour),
 * so a "24 hour" view selects by timestamp rather than by taking a fixed number of items.
 * At least one slot is always returned.
 */
export function slotsWithinHours<T extends { dt: number }>(items: T[], hours: number): T[] {
  if (items.length === 0) return items
  const cutoff = items[0].dt + hours * 3600
  const within = items.filter((i) => i.dt < cutoff)
  return within.length > 0 ? within : items.slice(0, 1)
}

// ─── Mock data for demo when no API key ───────────────────────────────────────
export function getMockWeatherData(city = 'New York'): WeatherData {
  const now = Math.floor(Date.now() / 1000)
  const mockCurrent: CurrentWeather = {
    name: city, country: 'US', lat: 40.71, lon: -74.0,
    temp: 22, feels_like: 20, temp_min: 18, temp_max: 26,
    humidity: 65, pressure: 1013, visibility: 10000,
    wind_speed: 5.2, wind_deg: 220, clouds: 20,
    sunrise: now - 3600 * 5, sunset: now + 3600 * 6,
    uv_index: 5, dt: now,
    condition: { id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' },
    timezone: -18000,
  }
  const hourly: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => ({
    dt: now + i * 3600,
    temp: 18 + Math.round(Math.sin(i / 4) * 6 + Math.random() * 2),
    feels_like: 17 + Math.round(Math.sin(i / 4) * 5),
    humidity: 60 + Math.round(Math.random() * 20),
    wind_speed: 4 + Math.round(Math.random() * 4),
    pop: Math.round(Math.random() * 30) / 100,
    condition: i % 6 === 0
      ? { id: 500, main: 'Rain', description: 'light rain', icon: '10d' }
      : { id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' },
  }))
  const daily: DailyForecast[] = Array.from({ length: 7 }, (_, i) => ({
    dt: now + i * 86400,
    temp_min: 14 + Math.round(Math.random() * 4),
    temp_max: 22 + Math.round(Math.random() * 6),
    humidity: 55 + Math.round(Math.random() * 25),
    wind_speed: 3 + Math.round(Math.random() * 5),
    pop: Math.round(Math.random() * 60) / 100,
    uv_index: 3 + Math.round(Math.random() * 5),
    condition: i === 2
      ? { id: 501, main: 'Rain', description: 'moderate rain', icon: '10d' }
      : i === 5
      ? { id: 200, main: 'Thunderstorm', description: 'thunderstorm', icon: '11d' }
      : { id: 800, main: 'Clear', description: 'clear sky', icon: '01d' },
    sunrise: now + i * 86400 - 3600 * 5,
    sunset:  now + i * 86400 + 3600 * 6,
  }))
  return { current: mockCurrent, hourly, daily }
}
