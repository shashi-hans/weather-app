'use client'
import { useState } from 'react'
import { useCityWeather } from './hooks/useCityWeather'
import { useTheme } from './hooks/useTheme'
import DayNightToggle from './components/DayNightToggle'
import SearchBar from './components/SearchBar'
import AddCityDialog from './components/AddCityDialog'
import CurrentWeatherCard from './components/CurrentWeatherCard'
import HourlyForecastCard from './components/HourlyForecastCard'
import DailyForecastCard from './components/DailyForecastCard'
import WeatherCharts from './components/WeatherCharts'
import ExtraDetails from './components/ExtraDetails'
import WeatherSkeleton from './components/WeatherSkeleton'

export default function WeatherApp() {
  const { isNight, pinned, toggle, followSystem } = useTheme()
  const { entries, activeIndex, setActiveIndex, addCity, removeCity, retry } = useCityWeather()
  const [adding, setAdding] = useState(false)
  const [searchNotice, setSearchNotice] = useState('')

  async function searchCity(city: string) {
    setSearchNotice('')
    const result = await addCity(city)
    if (!result.ok) setSearchNotice(result.reason)
  }

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
      {/* Decorative background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-3xl animate-float"
          style={{ top: '-200px', right: '-200px', background: 'var(--orb-primary)' }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{ bottom: '-100px', left: '-100px', background: 'var(--orb-secondary)', animationDelay: '2s' }}
        />
      </div>

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

          <div className="flex-shrink-0 ml-auto flex items-center gap-3">
            {pinned && (
              <button
                onClick={followSystem}
                className="text-xs font-semibold underline"
                style={{ color: 'var(--text-muted)' }}
                title="Go back to following the system light/dark setting"
              >
                Use system
              </button>
            )}
            <DayNightToggle isNight={isNight} toggle={toggle} />
          </div>

          <div className="w-full">
            <SearchBar
              onSearch={(city) => { void searchCity(city) }}
              onLocate={() => { setSearchNotice(''); if (entries[0]) retry(entries[0]) }}
              loading={entries[0]?.status === 'loading'}
            />
            {searchNotice && (
              <p className="text-xs font-medium mt-2 px-1" style={{ color: '#f87171' }}>
                {searchNotice}
              </p>
            )}
          </div>
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
          isNight={isNight}
          onActiveChange={setActiveIndex}
          onAddCity={() => setAdding(true)}
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
              <p>Data provided by OpenWeatherMap</p>
            </div>
          </>
        )}
      </main>

      {adding && (
        <AddCityDialog onAdd={addCity} onClose={() => setAdding(false)} />
      )}
    </div>
  )
}
