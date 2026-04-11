'use client'

type Props = { isNight: boolean; toggle: () => void }

export default function DayNightToggle({ isNight, toggle }: Props) {
  return (
    <button
      onClick={toggle}
      aria-label={isNight ? 'Switch to Day mode' : 'Switch to Night mode'}
      className="flex items-center gap-2 group"
    >
      <span className="text-xs font-semibold opacity-70" style={{ color: 'var(--text-secondary)' }}>
        {isNight ? 'Night' : 'Day'}
      </span>
      <div className="toggle-track">
        <div className="toggle-thumb">
          {isNight ? '🌙' : '☀️'}
        </div>
      </div>
    </button>
  )
}
