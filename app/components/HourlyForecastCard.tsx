'use client'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import type { HourlyForecast } from '../lib/weather'
import { formatTemp, formatHour, getWeatherEmoji } from '../lib/weather'

type Props = { hourly: HourlyForecast[]; isNight: boolean }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm shadow-xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', backdropFilter: 'blur(16px)' }}
    >
      <p className="font-bold">{d.time}</p>
      <p style={{ color: 'var(--accent)' }}>{formatTemp(d.temp)}</p>
      <p style={{ color: 'var(--text-muted)' }}>💧 {d.humidity}%</p>
      <p style={{ color: 'var(--text-muted)' }}>🌧️ {Math.round(d.pop * 100)}%</p>
    </div>
  )
}

export default function HourlyForecastCard({ hourly, isNight }: Props) {
  const data = hourly.slice(0, 24).map((h) => ({
    time:     formatHour(h.dt),
    temp:     Math.round(h.temp),
    humidity: h.humidity,
    pop:      h.pop,
    emoji:    getWeatherEmoji(h.condition.id, !isNight),
  }))

  const accent = isNight ? '#818cf8' : '#0ea5e9'
  const accentLight = isNight ? 'rgba(129,140,248,0.15)' : 'rgba(14,165,233,0.15)'

  return (
    <div className="glass-card rounded-3xl p-5 animate-fadeInUp">
      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        ⏰ 24-Hour Forecast
      </h3>

      {/* Scrollable emoji row */}
      <div className="hourly-scroll flex gap-3 mb-4">
        {data.map((h, i) => (
          <div
            key={i}
            className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl min-w-[64px]"
            style={{
              background: i === 0 ? accent : 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: i === 0 ? 'white' : 'var(--text-primary)',
            }}
          >
            <span className="text-xs font-medium opacity-80">{h.time}</span>
            <span className="text-xl">{h.emoji}</span>
            <span className="text-sm font-bold">{formatTemp(h.temp)}</span>
            {h.pop > 0.1 && (
              <span className="text-xs" style={{ color: i === 0 ? 'rgba(255,255,255,0.8)' : 'var(--accent)' }}>
                💧{Math.round(h.pop * 100)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Recharts temperature chart */}
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={accent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false} tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}°`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="temp"
              stroke={accent}
              strokeWidth={2.5}
              fill="url(#tempGrad)"
              dot={false}
              activeDot={{ r: 5, fill: accent, stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
