'use client'
import { useState, useRef } from 'react'

const POPULAR = ['New York', 'London', 'Tokyo', 'Paris', 'Dubai', 'Sydney', 'Mumbai', 'Toronto']

type Props = {
  onSearch: (city: string) => void
  onLocate: () => void
  loading: boolean
}

export default function SearchBar({ onSearch, onLocate, loading }: Props) {
  const [query, setQuery]       = useState('')
  const [focused, setFocused]   = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) { onSearch(query.trim()); setFocused(false) }
  }

  return (
    <div className="relative w-full max-w-lg">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search city..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all"
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(12px)',
            }}
          />
        </div>

        {/* GPS locate button */}
        <button
          type="button"
          onClick={onLocate}
          disabled={loading}
          title="Use my location"
          className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : '📍'}
        </button>
      </form>

      {/* Suggestions dropdown */}
      {focused && (
        <div
          className="absolute top-full mt-2 w-full rounded-2xl overflow-hidden z-50 shadow-2xl"
          style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--border-glass)' }}
        >
          <div className="px-3 py-2">
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Popular Cities
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((c) => (
                <button
                  key={c}
                  onMouseDown={() => { onSearch(c); setQuery(c); setFocused(false) }}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105"
                  style={{
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
