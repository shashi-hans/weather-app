import type { WeatherCondition } from '../weather'

/**
 * Open-Meteo reports conditions as WMO codes, while the rest of this app speaks
 * OpenWeather condition ids. Translating here keeps one vocabulary in the UI, so
 * getWeatherEmoji and the condition text need no provider-specific branches.
 */

type Mapped = { id: number; main: string; description: string }

const WMO: Record<number, Mapped> = {
  0:  { id: 800, main: 'Clear',        description: 'clear sky' },
  1:  { id: 801, main: 'Clouds',       description: 'mainly clear' },
  2:  { id: 802, main: 'Clouds',       description: 'partly cloudy' },
  3:  { id: 804, main: 'Clouds',       description: 'overcast' },
  45: { id: 741, main: 'Fog',          description: 'fog' },
  48: { id: 741, main: 'Fog',          description: 'depositing rime fog' },
  51: { id: 300, main: 'Drizzle',      description: 'light drizzle' },
  53: { id: 301, main: 'Drizzle',      description: 'moderate drizzle' },
  55: { id: 302, main: 'Drizzle',      description: 'dense drizzle' },
  56: { id: 511, main: 'Drizzle',      description: 'light freezing drizzle' },
  57: { id: 511, main: 'Drizzle',      description: 'dense freezing drizzle' },
  61: { id: 500, main: 'Rain',         description: 'slight rain' },
  63: { id: 501, main: 'Rain',         description: 'moderate rain' },
  65: { id: 502, main: 'Rain',         description: 'heavy rain' },
  66: { id: 511, main: 'Rain',         description: 'light freezing rain' },
  67: { id: 511, main: 'Rain',         description: 'heavy freezing rain' },
  71: { id: 600, main: 'Snow',         description: 'slight snow fall' },
  73: { id: 601, main: 'Snow',         description: 'moderate snow fall' },
  75: { id: 602, main: 'Snow',         description: 'heavy snow fall' },
  77: { id: 601, main: 'Snow',         description: 'snow grains' },
  80: { id: 520, main: 'Rain',         description: 'slight rain showers' },
  81: { id: 521, main: 'Rain',         description: 'moderate rain showers' },
  82: { id: 522, main: 'Rain',         description: 'violent rain showers' },
  85: { id: 620, main: 'Snow',         description: 'slight snow showers' },
  86: { id: 621, main: 'Snow',         description: 'heavy snow showers' },
  95: { id: 200, main: 'Thunderstorm', description: 'thunderstorm' },
  96: { id: 201, main: 'Thunderstorm', description: 'thunderstorm with slight hail' },
  99: { id: 202, main: 'Thunderstorm', description: 'thunderstorm with heavy hail' },
}

/** OpenWeather icon suffix, so the shape matches what the API already returned. */
function iconFor(id: number, isDay: boolean): string {
  const suffix = isDay ? 'd' : 'n'
  if (id === 800) return `01${suffix}`
  if (id === 801) return `02${suffix}`
  if (id === 802) return `03${suffix}`
  if (id >= 803) return `04${suffix}`
  if (id >= 700 && id < 800) return `50${suffix}`
  if (id >= 600) return `13${suffix}`
  if (id >= 500) return `10${suffix}`
  if (id >= 300) return `09${suffix}`
  return `11${suffix}`
}

export function conditionFromWmo(code: number, isDay = true): WeatherCondition {
  const mapped = WMO[code] ?? { id: 800, main: 'Unknown', description: 'unknown conditions' }
  return { ...mapped, icon: iconFor(mapped.id, isDay) }
}
