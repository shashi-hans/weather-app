export default function WeatherSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Hero card skeleton */}
      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="h-52 skeleton" />
        <div className="grid grid-cols-4 gap-px" style={{ background: 'var(--border-glass)' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20" style={{ background: 'var(--bg-card)' }}>
              <div className="skeleton h-full" />
            </div>
          ))}
        </div>
        <div className="h-16 skeleton mt-px" />
      </div>
      {/* Hourly skeleton */}
      <div className="glass-card rounded-3xl p-5">
        <div className="skeleton h-5 w-40 mb-4 rounded" />
        <div className="flex gap-3 mb-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-20 w-16 rounded-2xl flex-shrink-0" />)}
        </div>
        <div className="skeleton h-40 rounded-xl" />
      </div>
      {/* Daily skeleton */}
      <div className="glass-card rounded-3xl p-5">
        <div className="skeleton h-5 w-36 mb-4 rounded" />
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[...Array(7)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-28 rounded-2xl" />
      </div>
    </div>
  )
}
