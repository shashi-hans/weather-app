'use client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'
import type { DailyForecast, HourlyForecast } from '../lib/weather'
import { formatDay, formatHour, formatTemp, slotsWithinHours } from '../lib/weather'

/** Length of the humidity and rain view, matching the hourly forecast card. */
const HUMIDITY_HOURS = 24

type Props = {
  daily: DailyForecast[]
  hourly: HourlyForecast[]
  isNight: boolean
  /** Seconds to add to a UTC timestamp to get the clock at the city being shown. */
  timezone: number
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-sm shadow-xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', backdropFilter: 'blur(16px)' }}>
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'temp_max' ? '↑' : '↓'} {formatTemp(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function WeatherCharts({ daily, hourly, isNight, timezone }: Props) {
  const accent  = isNight ? '#818cf8' : '#0ea5e9'
  const accent2 = isNight ? '#c084fc' : '#38bdf8'

  const tempData = daily.map((d, i) => ({
    day:      i === 0 ? 'Today' : formatDay(d.dt, timezone),
    temp_max: Math.round(d.temp_max),
    temp_min: Math.round(d.temp_min),
  }))

  const humiditySlots = slotsWithinHours(hourly, HUMIDITY_HOURS)
  const humidityData = humiditySlots.map((h) => ({
    time:     formatHour(h.dt, timezone),
    humidity: h.humidity,
    pop:      Math.round(h.pop * 100),
  }))

  return (
    <div className="grid md:grid-cols-2 gap-4 animate-fadeInUp">
      {/* Temperature range bar chart */}
      <div className="glass-card rounded-3xl p-5">
        <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          🌡️ Temp Range — {tempData.length} Days
        </h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tempData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}°`} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="temp_max" fill={accent}  radius={[6,6,0,0]} maxBarSize={24} />
              <Bar dataKey="temp_min" fill={accent2} radius={[6,6,0,0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Humidity + rain probability */}
      <div className="glass-card rounded-3xl p-5">
        <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          💧 Humidity & Rain ({HUMIDITY_HOURS}h)
        </h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={humidityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 12, color: 'var(--text-primary)' }}
                formatter={(v: any, name: string) => [`${v}%`, name === 'humidity' ? '💧 Humidity' : '🌧️ Rain Chance']}
              />
              <Bar dataKey="humidity" fill={accent}  radius={[4,4,0,0]} maxBarSize={20} />
              <Bar dataKey="pop"      fill={accent2} radius={[4,4,0,0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
