import type { CurrentWeather } from '../lib/weather'
import { formatTemp, formatTime, windDirection, getWeatherEmoji } from '../lib/weather'

type Props = { weather: CurrentWeather; isNight: boolean }

export default function CurrentWeatherCard({ weather, isNight }: Props) {
  const isDay     = !isNight
  const emoji     = getWeatherEmoji(weather.condition.id, isDay)
  const sunriseStr = formatTime(weather.sunrise, weather.timezone)
  const sunsetStr  = formatTime(weather.sunset,  weather.timezone)

  return (
    <div className="glass-card rounded-3xl overflow-hidden animate-fadeInUp">
      {/* Top gradient strip */}
      <div className="hero-bg p-6 pb-8 text-white relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
          style={{ background: isNight ? '#818cf8' : '#38bdf8', transform: 'translate(40%,-40%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: isNight ? '#c084fc' : '#0ea5e9', transform: 'translate(-40%,40%)' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Location & condition */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📍</span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {weather.name}
                {weather.country && (
                  <span className="text-white/60 font-medium text-lg ml-2">{weather.country}</span>
                )}
              </h2>
            </div>
            <p className="capitalize text-white/80 text-sm mb-4">
              {weather.condition.description}
            </p>

            {/* Big temperature */}
            <div className="flex items-end gap-4">
              <span className="text-8xl md:text-9xl font-black leading-none tracking-tighter">
                {formatTemp(weather.temp)}C
              </span>
              <div className="pb-3 text-white/70">
                <div className="text-lg font-semibold">
                  ↑{formatTemp(weather.temp_max)} ↓{formatTemp(weather.temp_min)}
                </div>
                <div className="text-sm">Feels like {formatTemp(weather.feels_like)}</div>
              </div>
            </div>
          </div>

          {/* Weather emoji */}
          <div className="weather-icon-main text-[100px] md:text-[130px] leading-none select-none text-center">
            {emoji}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-px"
        style={{ background: 'var(--border-glass)' }}
      >
        {[
          { icon: '💧', label: 'Humidity',   value: `${weather.humidity}%` },
          { icon: '💨', label: 'Wind',        value: `${weather.wind_speed} m/s ${windDirection(weather.wind_deg)}` },
          { icon: '🌡️', label: 'Pressure',   value: `${weather.pressure} hPa` },
          { icon: '👁️', label: 'Visibility', value: `${(weather.visibility / 1000).toFixed(1)} km` },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center justify-center gap-1 py-4 px-2"
            style={{ background: 'var(--bg-card)' }}
          >
            <span className="text-2xl">{s.icon}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            <span className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Sunrise / Sunset */}
      <div className="flex items-center justify-around py-4 px-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌅</span>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sunrise</p>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{sunriseStr}</p>
          </div>
        </div>
        <div className="h-8 w-px" style={{ background: 'var(--border-glass)' }} />
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌇</span>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sunset</p>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{sunsetStr}</p>
          </div>
        </div>
        <div className="h-8 w-px" style={{ background: 'var(--border-glass)' }} />
        <div className="flex items-center gap-3">
          <span className="text-2xl">☁️</span>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cloud Cover</p>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{weather.clouds}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
