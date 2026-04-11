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

export function formatTime(unix: number, offset = 0): string {
  const d = new Date((unix + offset) * 1000)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
}

export function formatDay(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-US', { weekday: 'short' })
}

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatHour(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
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

export function getUVLabel(uv: number): { label: string; color: string } {
  if (uv < 3)  return { label: 'Low',      color: '#4ade80' }
  if (uv < 6)  return { label: 'Moderate', color: '#facc15' }
  if (uv < 8)  return { label: 'High',     color: '#fb923c' }
  if (uv < 11) return { label: 'Very High',color: '#f87171' }
  return { label: 'Extreme', color: '#c084fc' }
}

export function getAQILabel(aqi: number): { label: string; color: string } {
  const labels = ['', 'Good','Fair','Moderate','Poor','Very Poor']
  const colors = ['','#4ade80','#a3e635','#facc15','#fb923c','#f87171']
  return { label: labels[aqi] ?? 'N/A', color: colors[aqi] ?? '#9ca3af' }
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
