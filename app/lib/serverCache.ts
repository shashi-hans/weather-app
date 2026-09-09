/**
 * In-process cache and provider cooldown book, both held in module memory.
 *
 * On a serverless host each instance keeps its own copy and loses it when the
 * instance is recycled, so treat a hit as a bonus rather than a guarantee. The
 * response cache headers and the browser's own store do the durable work.
 */

type Entry<T> = { value: T; expiresAt: number }

/** Upper bound on entries, so a burst of distinct cities cannot grow memory without limit. */
const MAX_ENTRIES = 200

const store = new Map<string, Entry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    store.delete(key)
    return null
  }
  // Refresh insertion order so the least recently used entry is evicted first.
  store.delete(key)
  store.set(key, hit)
  return hit.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next()
    if (!oldest.done) store.delete(oldest.value)
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/** Age of a cached entry in seconds, or null when it is not held. */
export function cacheAgeSeconds(key: string, ttlMs: number): number | null {
  const hit = store.get(key)
  if (!hit) return null
  const age = Math.round((ttlMs - (hit.expiresAt - Date.now())) / 1000)
  return age >= 0 ? age : null
}

// ─── Provider cooldown ────────────────────────────────────────────────────────

const cooldowns = new Map<string, number>()

/** Parks a provider that reported a quota or rate limit, so it is skipped until it recovers. */
export function markExhausted(providerId: string, ms: number): void {
  cooldowns.set(providerId, Date.now() + ms)
}

export function isExhausted(providerId: string): boolean {
  const until = cooldowns.get(providerId)
  if (until === undefined) return false
  if (Date.now() >= until) {
    cooldowns.delete(providerId)
    return false
  }
  return true
}

/** Clears the cooldown book. Used by tests. */
export function resetCooldowns(): void {
  cooldowns.clear()
}
