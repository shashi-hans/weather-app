'use client'
import { useEffect, useState } from 'react'
import { canOpenLocationSettings, openLocationSettings } from '../lib/nativeBridge'

type Props = {
  /** Why the location card is standing in, written for a reader. */
  note: string
  onClose: () => void
}

/**
 * Warns that the app is showing a stand-in city because the device gave no position.
 * Raised once per run, so a reader who has decided to carry on is not asked again.
 * The card keeps the same sentence underneath, which is what they see after closing this.
 */
export default function LocationWarningDialog({ note, onClose }: Props) {
  const [canOpen, setCanOpen] = useState(false)

  useEffect(() => {
    setCanOpen(canOpenLocationSettings())
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
        role="alertdialog"
        aria-modal="true"
        aria-label="Location unavailable"
      >
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden="true" className="text-lg">📍</span>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Location unavailable
          </h2>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {note}
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Weather for every other saved city is unaffected.
        </p>

        <div className="flex gap-2 mt-5">
          {canOpen && (
            <button
              onClick={() => { void openLocationSettings(); onClose() }}
              className="flex-1 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'var(--accent)' }}
            >
              Turn on location
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm"
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-secondary)',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
