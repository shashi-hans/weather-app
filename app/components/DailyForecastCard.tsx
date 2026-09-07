'use client'
import { useState } from 'react'
import type { DailyForecast } from '../lib/weather'
import { formatTemp, formatDay, formatDate, getWeatherEmoji, getUVLabel } from '../lib/weather'

type Props = { daily: DailyForecast[]; isNight: boolean }

export default function DailyForecastCard({ daily, isNight }: Props) {
  const [selected, setSelected] = useState(0)
  if (daily.length === 0) return null
  // A shorter forecast can leave the stored index past the end of the list.
  const index = Math.min(selected, daily.length - 1)
  const sel = daily[index]
  const uv = getUVLabel(sel.uv_index)

  return (
    <div className="glass-card rounded-3xl p-5 animate-fadeInUp">
      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        📅 {daily.length}-Day Forecast
      </h3>

      {/* Day pills */}
      <div className="forecast-grid mb-5">
        {daily.map((d, i) => {
          const emoji = getWeatherEmoji(d.condition.id, !isNight)
          const isActive = i === index
          return (
            <button
              key={d.dt}
              onClick={() => setSelected(i)}
              className={`rounded-2xl p-2 flex flex-col items-center gap-1 transition-all hover:scale-105 ${isActive ? 'day-active' : ''}`}
              style={
                isActive
                  ? {}
                  : { background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }
              }
            >
              <span className="text-xs font-semibold" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                {i === 0 ? 'Today' : formatDay(d.dt)}
              </span>
              <span className="text-xl">{emoji}</span>
              <span className="text-xs font-bold" style={{ color: isActive ? 'white' : 'var(--text-primary)' }}>
                {formatTemp(d.temp_max)}
              </span>
              <span className="text-xs" style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                {formatTemp(d.temp_min)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {index === 0 ? 'Today' : `${formatDay(sel.dt)}, ${formatDate(sel.dt)}`}
            </p>
            <p className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>
              {sel.condition.description}
            </p>
          </div>
          <span className="text-5xl">{getWeatherEmoji(sel.condition.id, !isNight)}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '🌡️', label: 'High / Low',  value: `${formatTemp(sel.temp_max)} / ${formatTemp(sel.temp_min)}` },
            { icon: '🌧️', label: 'Rain Chance', value: `${Math.round(sel.pop * 100)}%` },
            { icon: '💧', label: 'Humidity',    value: `${sel.humidity}%` },
            { icon: '☀️', label: 'UV Index',    value: `${sel.uv_index.toFixed(1)} — ${uv.label}` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)' }}
            >
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
