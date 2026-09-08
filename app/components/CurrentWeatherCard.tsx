'use client'
import { Fragment, useEffect, useRef } from 'react'
import type { CityEntry } from '../hooks/useCityWeather'
import { formatTemp, formatTime, formatPop, windDirection, getWeatherEmoji, getUVLabel, isDaytime } from '../lib/weather'

type Props = {
  entries: CityEntry[]
  activeIndex: number
  isNight: boolean
  onActiveChange: (index: number) => void
  onAddCity: () => void
  onRemoveCity: (key: string) => void
  onRetry: (entry: CityEntry) => void
}

function HeroPanel({
  entry, isNight, onAddCity, onRemoveCity, onRetry,
}: {
  entry: CityEntry
  isNight: boolean
  onAddCity: () => void
  onRemoveCity: (key: string) => void
  onRetry: (entry: CityEntry) => void
}) {
  const weather = entry.data?.current

  return (
    <div className="hero-page hero-bg p-5 pb-6 text-white relative overflow-hidden">
      {/* City controls, pinned to the top right of the panel */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {entry.removable && (
          <button
            onClick={() => onRemoveCity(entry.key)}
            aria-label={`Remove ${entry.label}`}
            title={`Remove ${entry.label}`}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg leading-none transition-all hover:scale-110 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            ×
          </button>
        )}
        <button
          onClick={onAddCity}
          aria-label="Add a city"
          title="Add a city"
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold leading-none transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}
        >
          +
        </button>
      </div>

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
        style={{ background: isNight ? '#818cf8' : '#38bdf8', transform: 'translate(40%,-40%)' }} />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
        style={{ background: isNight ? '#c084fc' : '#0ea5e9', transform: 'translate(-40%,40%)' }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-h-[184px]">
        <div className="flex-1 pr-24">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xl">{entry.removable ? '🏙️' : '📍'}</span>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              {weather?.name ?? entry.label}
              {weather?.country && (
                <span className="text-white/60 font-medium text-base ml-2">{weather.country}</span>
              )}
            </h2>
          </div>

          {entry.status === 'loading' && (
            <p className="text-white/80 text-sm mt-5">Loading weather…</p>
          )}

          {entry.status === 'error' && (
            <div className="mt-5">
              <p className="text-white/80 text-sm mb-3">{entry.error}</p>
              <button
                onClick={() => onRetry(entry)}
                className="px-4 py-2 rounded-2xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                Try Again
              </button>
            </div>
          )}

          {weather && (
            <>
              <p className="capitalize text-white/80 text-sm mb-3">{weather.condition.description}</p>
              <div className="flex items-end gap-3">
                <span className="text-6xl md:text-7xl font-black leading-none tracking-tighter">
                  {formatTemp(weather.temp)}C
                </span>
                <div className="pb-2 text-white/70">
                  <div className="text-base font-semibold">
                    ↑{formatTemp(weather.temp_max)} ↓{formatTemp(weather.temp_min)}
                  </div>
                  <div className="text-xs">Feels like {formatTemp(weather.feels_like)}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {weather && (
          <div className="weather-icon-main text-[72px] md:text-[92px] leading-none select-none text-center">
            {getWeatherEmoji(weather.condition.id, isDaytime(weather.dt, weather.sunrise, weather.sunset))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CurrentWeatherCard({
  entries, activeIndex, isNight, onActiveChange, onAddCity, onRemoveCity, onRetry,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  // True while a programmatic scroll is animating. A smooth scroll fires scroll events for
  // every card it passes, and reporting those as selections would retarget the animation.
  const settling    = useRef(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(settleTimer.current), [])

  // Keep the scroll position in step with the active card when it changes from outside,
  // such as adding a city, removing one, or clicking a dot.
  useEffect(() => {
    const el = scroller.current
    if (!el || el.clientWidth === 0) return
    const target = activeIndex * el.clientWidth
    if (Math.abs(el.scrollLeft - target) <= 4) return

    settling.current = true
    clearTimeout(settleTimer.current)
    // Smooth scrolling reports no completion, so release the lock on a timer as well.
    settleTimer.current = setTimeout(() => { settling.current = false }, 600)
    el.scrollTo({ left: target, behavior: 'smooth' })
  }, [activeIndex, entries.length])

  function handleScroll() {
    const el = scroller.current
    if (!el || el.clientWidth === 0) return
    const index = Math.round(el.scrollLeft / el.clientWidth)

    if (settling.current) {
      if (index === activeIndex) {
        settling.current = false
        clearTimeout(settleTimer.current)
      }
      return
    }
    if (index !== activeIndex && index >= 0 && index < entries.length) onActiveChange(index)
  }

  const active  = entries[activeIndex] ?? entries[0]
  const weather = active?.data?.current
  const uv      = weather ? getUVLabel(weather.uv_index) : null
  // Chance of rain in the nearest forecast slot, which is the next 3 hours on the live API.
  const rainChance = formatPop(active?.data?.hourly?.[0]?.pop ?? 0)

  return (
    <div className="glass-card rounded-3xl overflow-hidden animate-fadeInUp">
      {/* Blue section: one panel per city, scrolled horizontally */}
      <div ref={scroller} onScroll={handleScroll} className="hero-scroll">
        {entries.map((entry) => (
          <HeroPanel
            key={entry.key}
            entry={entry}
            isNight={isNight}
            onAddCity={onAddCity}
            onRemoveCity={onRemoveCity}
            onRetry={onRetry}
          />
        ))}
      </div>

      {/* Position dots, shown once there is more than one city */}
      {entries.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3" style={{ background: 'var(--bg-card)' }}>
          {entries.map((entry, i) => (
            <button
              key={entry.key}
              onClick={() => onActiveChange(i)}
              aria-label={`Show ${entry.label}`}
              aria-current={i === activeIndex}
              className="rounded-full transition-all"
              style={{
                width: i === activeIndex ? 20 : 8,
                height: 8,
                // A glass border tone would be white on the white strip, so inactive dots use muted text.
                background: 'var(--accent)',
                opacity: i === activeIndex ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      )}

      {/* White section: details for the visible city */}
      {weather && (
        <>
          {/* Six readings laid out as two rows of three at every width */}
          <div className="grid grid-cols-3 gap-px"
            style={{ background: 'var(--border-glass)' }}>
            {[
              { icon: '🌧️', label: 'Rain Chance', value: rainChance },
              { icon: '☀️', label: 'UV Index',    value: `${weather.uv_index.toFixed(1)}`, note: uv?.label, noteColor: uv?.color },
              { icon: '💨', label: 'Wind',        value: `${weather.wind_speed} m/s ${windDirection(weather.wind_deg)}` },
              { icon: '💧', label: 'Humidity',    value: `${weather.humidity}%` },
              { icon: '🌡️', label: 'Pressure',    value: `${weather.pressure} hPa` },
              { icon: '👁️', label: 'Visibility',  value: `${(weather.visibility / 1000).toFixed(1)} km` },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center gap-1 py-4 px-2"
                style={{ background: 'var(--bg-card)' }}
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <span className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                {s.note && (
                  <span className="text-[10px] font-semibold" style={{ color: s.noteColor }}>{s.note}</span>
                )}
              </div>
            ))}
          </div>

          {/* Sun times and cloud cover share the closing row */}
          <div className="flex items-center justify-between py-4 px-3 gap-1">
            {[
              { icon: '🌅', label: 'Sunrise',     value: formatTime(weather.sunrise, weather.timezone) },
              { icon: '🌇', label: 'Sunset',      value: formatTime(weather.sunset, weather.timezone) },
              { icon: '☁️', label: 'Cloud Cover', value: `${weather.clouds}%` },
            ].map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && <div className="h-8 w-px flex-shrink-0" style={{ background: 'var(--border-glass)' }} />}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                    <p className="font-bold text-sm whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                      {s.value}
                    </p>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
