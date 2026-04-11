'use client'
import { useState, useEffect } from 'react'
import { useWeather } from './hooks/useWeather'
import DayNightToggle from './components/DayNightToggle'
import SearchBar from './components/SearchBar'
import CurrentWeatherCard from './components/CurrentWeatherCard'
import HourlyForecastCard from './components/HourlyForecastCard'
import DailyForecastCard from './components/DailyForecastCard'
import WeatherCharts from './components/WeatherCharts'
import ExtraDetails from './components/ExtraDetails'
import WeatherSkeleton from './components/WeatherSkeleton'

export default function WeatherApp() {
  const [isNight, setIsNight] = useState(false)
  const { data, status, error, fetchByLocation, fetchByCity } = useWeather()

  // Auto-detect theme from system time
  useEffect(() => {
    const hour = new Date().getHours()
    setIsNight(hour < 6 || hour >= 20)
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isNight ? 'night' : 'day')
  }, [isNight])

  // Load weather on mount
  useEffect(() => {
    fetchByLocation()
  }, [])

  const loading = status === 'idle' || status === 'locating' || status === 'loading'

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ background: isNight
        ? 'radial-gradient(ellipse at top, #1e1b4b 0%, #0a0f1e 60%)'
        : 'radial-gradient(ellipse at top, #bae6fd 0%, #e0f2fe 60%)' }}
    >
      {/* Decorative background orbs */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-3xl animate-float"
          style={{
            top: '-200px', right: '-200px',
            background: isNight ? '#4f46e5' : '#0ea5e9',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{
            bottom: '-100px', left: '-100px',
            background: isNight ? '#7c3aed' : '#38bdf8',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: isNight ? 'rgba(10,15,30,0.8)' : 'rgba(224,242,254,0.8)',
          borderColor: 'var(--border-glass)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🌤️</span>
            <span className="text-xl font-extrabold" style={{ color: 'var(--accent)' }}>
              WeatherNow
            </span>
          </div>

          {/* Toggle — right of logo */}
          <div className="flex-shrink-0 ml-auto">
            <DayNightToggle isNight={isNight} toggle={() => setIsNight((n) => !n)} />
          </div>

          {/* Search — always on its own row */}
          <div className="w-full">
            <SearchBar
              onSearch={fetchByCity}
              onLocate={fetchByLocation}
              loading={loading}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4 relative z-10">
        {/* Mock data notice */}
        {data?.isMock && status === 'success' && (
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

        {/* Loading */}
        {loading && <WeatherSkeleton />}

        {/* Error */}
        {status === 'error' && (
          <div
            className="glass-card rounded-3xl p-10 text-center"
          >
            <div className="text-6xl mb-4">⛈️</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Could not load weather
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button
              onClick={() => fetchByLocation()}
              className="px-6 py-2.5 rounded-2xl font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'var(--accent)' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Weather content */}
        {status === 'success' && data && (
          <>
            <CurrentWeatherCard weather={data.current} isNight={isNight} />
            <HourlyForecastCard hourly={data.hourly} isNight={isNight} />
            <DailyForecastCard  daily={data.daily}  isNight={isNight} />
            <WeatherCharts      daily={data.daily} hourly={data.hourly} isNight={isNight} />
            <ExtraDetails       weather={data.current} />

            {/* Footer */}
            <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Last updated: {new Date(data.current.dt * 1000).toLocaleTimeString()}
              {' · '}
              App Built by Shashi Hans
              <p>Data provided by OpenWeatherMap</p>
            </div>
          </>
        )}

        {/* Welcome state */}
        {status === 'idle' && (
          <div className="glass-card rounded-3xl p-16 text-center">
            <div className="text-8xl mb-6 animate-float">🌤️</div>
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: 'var(--text-primary)' }}>
              Welcome to WeatherNow
            </h2>
            <p className="mb-8 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              Allow location access or search for any city to get started
            </p>
            <button
              onClick={fetchByLocation}
              className="px-8 py-3 rounded-2xl font-bold text-white text-lg transition-all hover:scale-105 shadow-lg"
              style={{ background: 'var(--accent)' }}
            >
              📍 Use My Location
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
