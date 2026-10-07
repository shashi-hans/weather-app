'use client'
import { useEffect, useRef, useState } from 'react'
import type { CityEntry } from '../hooks/useCityWeather'
import { formatTemp, formatTime, formatPop, windDirection, windKmh, getUVLabel, getAQILabel } from '../lib/weather'
import { canOpenLocationSettings, openLocationSettings } from '../lib/nativeBridge'

type Props = {
  entries: CityEntry[]
  activeIndex: number
  onActiveChange: (index: number) => void
  onRemoveCity: (key: string) => void
  onRetry: (entry: CityEntry) => void
}

function HeroPanel({
  entry, onRemoveCity, onRetry,
}: {
  entry: CityEntry
  onRemoveCity: (key: string) => void
  onRetry: (entry: CityEntry) => void
}) {
  const weather = entry.data?.current

  return (
    /* No panel of its own: the live sky the page draws is the background here. */
    <div className="hero-page p-5 pb-6 text-white relative">
      {/* Removing a city belongs to the card it removes. Adding one lives in the header. */}
      {/* The floor keeps every city panel the same height while one is still loading. */}
      <div className="relative z-10 flex flex-col gap-3 min-h-[136px]">
        {/* Right padding leaves the add and remove buttons their corner. */}
        <div className="pr-24">
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
              {entry.locationNote && <LocationNote note={entry.locationNote} />}
              {entry.cachedAt && (
                <p className="text-white/70 text-xs mb-3 flex items-center gap-1.5">
                  <span aria-hidden="true">⚡</span>
                  Offline — saved reading from {new Date(entry.cachedAt).toLocaleTimeString()}
                </p>
              )}
              <div className="flex items-end gap-3">
                <span className="text-5xl md:text-6xl font-black leading-none tracking-tighter">
                  {formatTemp(weather.temp)}C
                </span>
                {/* Held on one line each, so the row does not wrap on a narrow phone. */}
                <div className="pb-2 text-white/70 whitespace-nowrap">
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
          /* Air quality leads the row; removing this city closes it on the right. */
          <div className="flex items-center justify-between gap-3">
            {weather.aqi === undefined ? <span /> : <AirQuality aqi={weather.aqi} />}
            {entry.removable && (
              <button
                onClick={() => onRemoveCity(entry.key)}
                aria-label={`Remove ${entry.label}`}
                title={`Remove ${entry.label}`}
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-lg leading-none transition-all hover:scale-110 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Why the location card is showing a stand-in city, with a shortcut to Android's
 * location settings when the app is running there. The shortcut is decided after
 * mount, because the Capacitor global does not exist while the page is prerendered
 * and reading it during render would make the two passes disagree.
 */
function LocationNote({ note }: { note: string }) {
  const [canOpen, setCanOpen] = useState(false)
  useEffect(() => { setCanOpen(canOpenLocationSettings()) }, [])

  return (
    /* Inline flow rather than a flex row, so the pin stays with the text it marks. */
    <p className="text-white/70 text-xs mb-3 leading-relaxed">
      <span aria-hidden="true" className="mr-1">📍</span>
      {note}
      {canOpen && (
        <button
          onClick={() => { void openLocationSettings() }}
          className="ml-1.5 underline font-semibold underline-offset-2"
        >
          Turn on location
        </button>
      )}
    </p>
  )
}

/**
 * Air quality as a leaf filled with the band's colour, beside the reading.
 *
 * A leaf is the sign this measurement carries everywhere, so it needs no label to be
 * understood, and colouring the leaf itself rather than a swatch next to it means
 * the severity is read in the same glance as the icon.
 */
function AirQuality({ aqi }: { aqi: number }) {
  const band = getAQILabel(aqi)

  return (
    <div className="flex items-center gap-2 min-w-0">
      <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <path
          d="M20 3c-9 0-15 4.2-15 11a8 8 0 0 0 1.4 4.6L4 21l1.5 1.3 2.3-2.5A8.6 8.6 0 0 0 12 21c7 0 8-9.3 8-18Z"
          fill={band.color}
        />
        {/* The midrib, drawn as a gap in the leaf so it reads at this size. */}
        <path
          d="M17.4 6.2C13 8.4 10 12.2 8.6 17.4"
          fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.3" strokeLinecap="round"
        />
      </svg>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-white/60 leading-tight">Air Quality</p>
        <p className="text-base font-bold leading-tight">
          {aqi} <span style={{ color: band.color }}>{band.label}</span>
        </p>
      </div>
    </div>
  )
}

/** Quiet time after the last scroll event before the carousel counts as stopped. */
const SETTLE_MS = 20

export default function CurrentWeatherCard({
  entries, activeIndex, onActiveChange, onRemoveCity, onRetry,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  // True while a programmatic scroll is animating. A smooth scroll fires scroll events for
  // every card it passes, and reporting those as selections would retarget the animation.
  const settling    = useRef(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>()
  /** Fires once the carousel has come to rest, to name the card it stopped on. */
  const restTimer   = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => {
    clearTimeout(settleTimer.current)
    clearTimeout(restTimer.current)
  }, [])

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

  /*
   * The card in view is reported once the scroll has stopped, not while the finger
   * is still moving.
   *
   * Changing it mid-drag re-rendered the whole page, sky and charts included, on
   * every scroll event the browser fired, and the carousel stuttered under it. The
   * native snap settles first; this only has to name where it landed.
   */
  function handleScroll() {
    const el = scroller.current
    if (!el || el.clientWidth === 0) return

    if (settling.current) {
      if (Math.round(el.scrollLeft / el.clientWidth) === activeIndex) {
        settling.current = false
        clearTimeout(settleTimer.current)
      }
      return
    }

    clearTimeout(restTimer.current)
    restTimer.current = setTimeout(() => {
      const target = scroller.current
      if (!target || target.clientWidth === 0) return
      const index = Math.round(target.scrollLeft / target.clientWidth)
      if (index !== activeIndex && index >= 0 && index < entries.length) onActiveChange(index)
    }, SETTLE_MS)
  }

  const active  = entries[activeIndex] ?? entries[0]
  const weather = active?.data?.current
  const uv      = weather ? getUVLabel(weather.uv_index) : null
  // Chance of rain in the nearest forecast slot: the coming hour from Open-Meteo,
  // the coming three hours from OpenWeatherMap.
  const rainChance = formatPop(active?.data?.hourly?.[0]?.pop ?? 0)

  return (
    /*
     * The city block sits straight on the sky with no card around it, the way a
     * phone's own weather app reads, and the details below keep theirs.
     */
    <div className="city-block animate-fadeInUp">
      {/* One panel per city, scrolled horizontally */}
      <div ref={scroller} onScroll={handleScroll} className="hero-scroll">
        {entries.map((entry) => (
          <HeroPanel
            key={entry.key}
            entry={entry}
            onRemoveCity={onRemoveCity}
            onRetry={onRetry}
          />
        ))}
      </div>

      {/* Position dots, shown once there is more than one city */}
      {entries.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3">
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

      {/* Details for the visible city, in their own panel */}
      {weather && (
        /* Tighter and barely tinted, so the sky keeps showing through the readings. */
        /* Every reading for today in one footer, sun times among them. */
        <div className="details-panel rounded-3xl overflow-hidden mt-1">
          <div className="grid grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.1)' }}>
            {[
              { label: 'Rain Chance', value: rainChance },
              { label: 'UV Index',    value: weather.uv_index.toFixed(1), note: uv?.label, noteColor: uv?.color },
              { label: 'Wind',        value: `${windKmh(weather.wind_speed)} km/h ${windDirection(weather.wind_deg)}` },
              { label: 'Humidity',    value: `${weather.humidity}%` },
              { label: 'Pressure',    value: `${weather.pressure} hPa` },
              { label: 'Visibility',  value: `${(weather.visibility / 1000).toFixed(1)} km` },
              { label: 'Sunrise',     value: formatTime(weather.sunrise, weather.timezone) },
              { label: 'Sunset',      value: formatTime(weather.sunset, weather.timezone) },
              { label: 'Cloud Cover', value: `${weather.clouds}%` },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-2"
                style={{ background: 'rgba(10, 16, 34, 0.42)' }}
              >
                <span className="text-[11px] font-medium text-white/70">{s.label}</span>
                <span className="text-sm font-bold text-center text-white whitespace-nowrap">{s.value}</span>
                {s.note && (
                  <span className="text-[10px] font-semibold" style={{ color: s.noteColor }}>{s.note}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
