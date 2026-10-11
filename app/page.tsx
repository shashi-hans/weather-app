'use client'
import { useEffect, useRef, useState } from 'react'
import { useCityWeather, LOCATION_KEY } from './hooks/useCityWeather'
import { isDaytime } from './lib/weather'
import { useTheme } from './hooks/useTheme'
import AddCityDialog from './components/AddCityDialog'
import LocationWarningDialog from './components/LocationWarningDialog'
import PullToRefresh from './components/PullToRefresh'
import SkyBackground from './components/SkyBackground'
import CurrentWeatherCard from './components/CurrentWeatherCard'
import HourlyForecastCard from './components/HourlyForecastCard'
import DailyForecastCard from './components/DailyForecastCard'
import WeatherCharts from './components/WeatherCharts'
import ExtraDetails from './components/ExtraDetails'
import WeatherSkeleton from './components/WeatherSkeleton'

export default function WeatherSky() {
  const { isNight } = useTheme()
  const { entries, activeIndex, setActiveIndex, addCity, removeCity, retry, refreshAll } = useCityWeather()
  const [adding, setAdding] = useState(false)

  /*
   * Warn once a run that the location card is showing a stand-in city. Raising it
   * again on every failed refresh would nag someone who has already decided to
   * carry on, and the card keeps the same sentence for as long as it applies.
   */
  const locationNote = entries.find((e) => e.key === LOCATION_KEY)?.locationNote
  const [locationWarning, setLocationWarning] = useState('')
  const warned = useRef(false)

  useEffect(() => {
    if (locationNote && !warned.current) {
      warned.current = true
      setLocationWarning(locationNote)
    }
  }, [locationNote])

  const active = entries[activeIndex] ?? entries[0]
  const data   = active?.data

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      /*
       * These colours come from CSS variables rather than the isNight state so the very first
       * paint, which happens before the theme hook runs, already matches the system setting.
       */
      style={{ background: 'var(--gradient-page)' }}
    >
      {/*
       * The live sky for whichever city the carousel is showing, behind the whole
       * page. Daylight is taken from that city, not from this device, so a card for
       * somewhere the sun is up keeps a daytime sky.
       */}
      <PullToRefresh onRefresh={refreshAll} />

      <SkyBackground
        code={data?.current.condition.id}
        isDay={data ? isDaytime(data.current.dt, data.current.sunrise, data.current.sunset) : !isNight}
      />

      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--header-bg)',
          borderColor: 'var(--border-glass)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🌦️</span>
            <span className="text-xl font-extrabold" style={{ color: 'var(--accent)' }}>
              Weather Sky
            </span>
          </div>

          <button
            onClick={() => setAdding(true)}
            aria-label="Add a city"
            title="Add a city"
            className="ml-auto w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold leading-none transition-all hover:scale-110 active:scale-95"
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
            }}
          >
            +
          </button>


        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4 relative z-10">
        {/* Sample-data notice, development builds only */}
        {process.env.NODE_ENV !== 'production' && data?.isMock && active?.status === 'success' && (
          <div
            className="rounded-2xl px-4 py-3 text-sm flex items-center gap-3"
            style={{
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.3)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="text-xl">💡</span>
            <p>
              <strong>Demo Mode</strong> — showing sample data.
              Add your <code className="bg-black/10 px-1 rounded">OPENWEATHER_API_KEY</code> to{' '}
              <code className="bg-black/10 px-1 rounded">.env.local</code> for live weather.
              Get a free key at{' '}
              <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer"
                className="underline font-semibold">openweathermap.org</a>
            </p>
          </div>
        )}

        {/* Blue city carousel plus the white detail strip for the visible city */}
        <CurrentWeatherCard
          entries={entries}
          activeIndex={activeIndex}
          onActiveChange={setActiveIndex}
          onRemoveCity={removeCity}
          onRetry={retry}
        />

        {/* Everything below follows the city currently shown in the carousel */}
        {active?.status === 'loading' && <WeatherSkeleton />}

        {active?.status === 'success' && data && (
          <>
            <HourlyForecastCard
              hourly={data.hourly}
              isNight={isNight}
              sunrise={data.current.sunrise}
              sunset={data.current.sunset}
              timezone={data.current.timezone}
            />
            <DailyForecastCard  daily={data.daily} timezone={data.current.timezone} />
            <WeatherCharts
              daily={data.daily}
              hourly={data.hourly}
              isNight={isNight}
              timezone={data.current.timezone}
            />
            <ExtraDetails       weather={data.current} />

            <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Last updated: {new Date(data.current.dt * 1000).toLocaleTimeString()}
              {' · '}
              App Built by Shashi Hans
              {' · '}
              <a href="/privacy" className="underline">Privacy</a>
              <p>Weather data by Open-Meteo and OpenWeatherMap · Place names © OpenStreetMap contributors</p>
            </div>
          </>
        )}
      </main>

      {adding && (
        <AddCityDialog onAdd={addCity} onClose={() => setAdding(false)} />
      )}

      {locationWarning && (
        <LocationWarningDialog note={locationWarning} onClose={() => setLocationWarning('')} />
      )}
    </div>
  )
}
