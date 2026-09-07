'use client'
import { useEffect, useRef, useState } from 'react'
import { POPULAR_CITIES } from '../lib/cities'

type Props = {
  onAdd: (city: string) => Promise<{ ok: boolean; reason?: string }>
  onClose: () => void
}

export default function AddCityDialog({ onAdd, onClose }: Props) {
  const [query, setQuery]     = useState('')
  const [notice, setNotice]   = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(city: string) {
    if (checking) return
    setChecking(true)
    setNotice('')
    try {
      const result = await onAdd(city)
      if (result.ok) onClose()
      else setNotice(result.reason ?? 'Could not add that city')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-24"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 shadow-2xl"
        style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--border-glass)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add a city"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Add a city</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full text-lg leading-none"
            style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void submit(query) }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setNotice('') }}
            placeholder="City name"
            maxLength={100}
            disabled={checking}
            className="flex-1 px-4 py-3 rounded-2xl text-sm font-medium outline-none disabled:opacity-60"
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={checking}
            className="px-4 rounded-2xl font-bold text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {checking ? '…' : 'Add'}
          </button>
        </form>

        {notice && (
          <p className="mt-2 text-xs font-medium" style={{ color: '#f87171' }}>{notice}</p>
        )}

        <p className="text-xs font-semibold mt-4 mb-2" style={{ color: 'var(--text-muted)' }}>
          Popular Cities
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              disabled={checking}
              onClick={() => void submit(c)}
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
  )
}
