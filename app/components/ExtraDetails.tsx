import type { CurrentWeather } from '../lib/weather'
import { getUVLabel, windDirection } from '../lib/weather'

type Props = { weather: CurrentWeather }

/** Holds a bar width inside 0..100, since CSS ignores a negative percentage. */
function clampPct(value: number): number {
  return Math.min(Math.max(value, 0), 100)
}

function WindCompass({ deg }: { deg: number }) {
  return (
    <div className="relative w-20 h-20 mx-auto">
      {/* Compass circle */}
      <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center relative"
        style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-glass)' }}>
        {/* Cardinal points */}
        {['N','E','S','W'].map((d, i) => (
          <span key={d} className="absolute text-[9px] font-bold"
            style={{
              color: 'var(--text-muted)',
              top:    i === 0 ? '2px'  : i === 2 ? 'auto' : '50%',
              bottom: i === 2 ? '2px'  : 'auto',
              left:   i === 3 ? '2px'  : i === 1 ? 'auto' : '50%',
              right:  i === 1 ? '2px'  : 'auto',
              transform: (i === 0 || i === 2) ? 'translateX(-50%)' : 'translateY(-50%)',
            }}>
            {d}
          </span>
        ))}
        {/* Arrow */}
        <div className="w-1 h-7 rounded-full relative" style={{ transform: `rotate(${deg}deg)`, background: 'var(--accent)' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '6px solid var(--accent)' }} />
        </div>
      </div>
    </div>
  )
}

function UVBar({ value }: { value: number }) {
  const { color, label } = getUVLabel(value)
  const pct = Math.min((value / 12) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text-muted)' }}>UV Index</span>
        <span className="font-bold" style={{ color }}>{value.toFixed(1)} — {label}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, #4ade80, #facc15, #fb923c, ${color})` }} />
      </div>
    </div>
  )
}

export default function ExtraDetails({ weather }: Props) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeInUp">
      {/* Wind */}
      <div className="glass-card rounded-3xl p-5">
        <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-muted)' }}>💨 Wind</h4>
        <WindCompass deg={weather.wind_deg} />
        <div className="text-center mt-3">
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {weather.wind_speed} <span className="text-sm font-normal">m/s</span>
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {windDirection(weather.wind_deg)} direction
          </p>
        </div>
      </div>

      {/* UV & Sun */}
      <div className="glass-card rounded-3xl p-5">
        <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-muted)' }}>☀️ UV & Sun</h4>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
              {weather.uv_index.toFixed(1)}
            </p>
            <p className="text-sm font-semibold" style={{ color: getUVLabel(weather.uv_index).color }}>
              {getUVLabel(weather.uv_index).label}
            </p>
          </div>
          <UVBar value={weather.uv_index} />
        </div>
      </div>

      {/* Atmosphere */}
      <div className="glass-card rounded-3xl p-5 sm:col-span-2 lg:col-span-1">
        <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-muted)' }}>🌫️ Atmosphere</h4>
        <div className="space-y-3">
          {[
            // Clamped at both ends: a cyclone below 970 hPa would otherwise give a negative width.
            { label: 'Pressure',    value: `${weather.pressure} hPa`, icon: '🔽', pct: clampPct(((weather.pressure - 970) / 60) * 100) },
            { label: 'Humidity',    value: `${weather.humidity}%`,    icon: '💧', pct: weather.humidity },
            { label: 'Visibility',  value: `${(weather.visibility/1000).toFixed(1)} km`, icon: '👁️', pct: Math.min((weather.visibility / 10000) * 100, 100) },
            { label: 'Cloud Cover', value: `${weather.clouds}%`,     icon: '☁️', pct: weather.clouds },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-muted)' }}>{s.icon} {s.label}</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${s.pct}%`, background: 'var(--accent)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
